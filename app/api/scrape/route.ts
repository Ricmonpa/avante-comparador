import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { kv } from '@vercel/kv';
import InventoryStore from '../../../lib/inventory-store';
import ScrapeCache from '../../../lib/scrape-cache';
import type { CompetitorInfo, PriceHistoryEntry } from '../../../types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Extrae el tiempo de espera real del error 429 de Gemini ("Please retry in 12s")
function extractRetryDelay(error: any): number {
  const msg = String(error?.message || error || '');
  const match = msg.match(/retry in (\d+)s/i);
  return match ? parseInt(match[1], 10) * 1000 + 1000 : 20000; // +1s buffer
}

// Retry con backoff exponencial; para 429 respeta el tiempo indicado por Gemini
async function withRetry<T>(fn: () => Promise<T>, retries = 4): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      if (i === retries - 1) throw e;
      const is429 = String(e?.message || e).includes('429');
      const delay = is429 ? extractRetryDelay(e) : 1000 * Math.pow(2, i);
      console.log(`⏳ Retry ${i + 1}/${retries - 1} en ${Math.round(delay / 1000)}s${is429 ? ' (rate limit Gemini)' : ''}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Max retries reached');
}

async function searchWithSerper(query: string) {
  return withRetry(async () => {
    const response = await fetch("https://google.serper.dev/shopping", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, gl: "mx", hl: "es" }),
    });
    const data = await response.json();
    console.log(`📦 Serper devolvió ${data.shopping?.length || 0} resultados`);
    return data.shopping || [];
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Falta la llanta' }, { status: 400 });
  }

  const scrapeCache = ScrapeCache.getInstance();
  const cacheKey = scrapeCache.normalizeKey(query);

  // Revisar cache primero
  const cached = scrapeCache.get<object>(cacheKey);
  if (cached) {
    console.log(`⚡ Cache hit para: ${query}`);
    return NextResponse.json(cached);
  }

  try {
    console.log(`🔍 Iniciando búsqueda inteligente para: ${query}`);

    const inventoryStore = InventoryStore.getInstance();
    const localMatches = inventoryStore.searchProducts(query);

    let avanteProduct = null;
    if (localMatches.length > 0) {
      avanteProduct = localMatches[0];
    }

    const allResults = await searchWithSerper(query);

    if (!allResults || allResults.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No se encontraron ofertas en Google Shopping."
      }, { status: 200 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      Eres un experto en el mercado de llantas/neumáticos en México.
      Analiza la siguiente lista de productos de Google Shopping para la búsqueda: "${query}".

      Lista de productos: ${JSON.stringify(allResults.slice(0, 10))}

      REGLAS CRÍTICAS:
      - SOLO considera resultados que sean LLANTAS o NEUMÁTICOS reales.
      - Si un resultado no es una llanta (por ejemplo, accesorios, cajas, herramientas, ropa u otros productos), IGNÓRALO COMPLETAMENTE.
      - Un precio de llanta real en México está típicamente entre $600 y $15,000 MXN. Precios fuera de ese rango son sospechosos.
      - Si no encuentras ningún resultado que sea claramente una llanta, devuelve "competitors" como array vacío [].

      Tu tarea:
      1. Identifica el producto de "Grupo Avante" o "Avante" (si existe).
      2. De los resultados que SÍ sean llantas, identifica los 3 mejores competidores (los más baratos que NO sean Avante), ordenados de menor a mayor precio.
      3. Extrae las medidas de la llanta (ej: 205/55 R16).
      4. Para cada competidor, incluye el campo "link" exactamente como viene en la lista.

      Responde ÚNICAMENTE en formato JSON con esta estructura:
      {
        "specs": "medida encontrada o null",
        "avante": {"found": true/false, "price": número, "title": "título"},
        "competitors": [
          {"vendor": "nombre tienda", "price": número, "title": "título", "link": "url o null"},
          {"vendor": "nombre tienda", "price": número, "title": "título", "link": "url o null"},
          {"vendor": "nombre tienda", "price": número, "title": "título", "link": "url o null"}
        ]
      }
    `;

    const geminiResult = await withRetry(() => model.generateContent(prompt));
    const responseIA = JSON.parse(
      geminiResult.response.text().replace(/```json|```/g, "")
    );

    // Normalizar competitors como array (Gemini puede devolver 1, 2 o 3)
    const rawCompetitors: CompetitorInfo[] = (responseIA.competitors || [])
      .slice(0, 3)
      .map((c: { vendor?: string; price?: number; title?: string; link?: string }) => {
        // Fallback link: buscar en resultados Serper si Gemini no lo trajo
        let link = c.link || null;
        if (!link && c.title) {
          const match = allResults.find(
            (r: { link?: string; productLink?: string; source?: string; title?: string }) =>
              (r.source === c.vendor ||
                (r.title && String(r.title).includes(String(c.title).slice(0, 30)))) &&
              (r.link || r.productLink)
          );
          link = match?.link || match?.productLink || null;
        }
        return {
          vendor: c.vendor || 'Desconocido',
          price: c.price || 0,
          title: c.title || '',
          link,
        };
      });

    // El mejor competidor (más barato) para backwards compat
    const bestCompetitor = rawCompetitors[0] || null;

    const finalAvanteData = avanteProduct ? {
      price: avanteProduct.price,
      found: true,
      url: `https://www.grupoavante.org/search?q=${encodeURIComponent(query)}`,
      source: 'local_inventory',
      sku: avanteProduct.sku,
      stock: avanteProduct.stock
    } : {
      price: responseIA.avante?.price || 0,
      found: responseIA.avante?.found || false,
      url: `https://www.grupoavante.org/search?q=${encodeURIComponent(query)}`,
      source: 'google_shopping'
    };

    const responseData = {
      success: true,
      mode: 'AI_OPTIMIZED',
      specsDetected: responseIA.specs,
      data: {
        product: bestCompetitor?.title,
        avante: finalAvanteData,
        // Mantener campo "competitor" para compatibilidad con analyze/route.ts
        competitor: bestCompetitor
          ? { ...bestCompetitor }
          : { vendor: null, price: 0, title: null, link: null },
        // Array completo de hasta 3 competidores para la UI
        competitors: rawCompetitors,
        currency: 'MXN',
        localInventoryChecked: true,
        localMatches: localMatches.length
      }
    };

    // Guardar en cache en memoria
    scrapeCache.set(cacheKey, responseData);

    // Guardar historial en Vercel KV (graceful degradation)
    if (finalAvanteData.found && bestCompetitor) {
      try {
        const historyEntry: PriceHistoryEntry = {
          date: new Date().toISOString(),
          avantePrice: finalAvanteData.price,
          competitorPrice: bestCompetitor.price,
          competitorVendor: bestCompetitor.vendor,
          query,
        };
        await kv.lpush(`price_history:${cacheKey}`, JSON.stringify(historyEntry));
        await kv.ltrim(`price_history:${cacheKey}`, 0, 29); // últimas 30 entradas
      } catch {
        // KV no configurado, ignorar silenciosamente
      }
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("Error en el motor de inteligencia:", error);
    return NextResponse.json({
      success: false,
      error: "Error procesando los datos con IA."
    }, { status: 500 });
  }
}
