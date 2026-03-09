import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import InventoryStore from '../../../lib/inventory-store';

// Inicializamos el "Cerebro" (Gemini)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function searchWithSerper(query: string) {
  const response = await fetch("https://google.serper.dev/shopping", {
    method: "POST",
    headers: {
      "X-API-KEY": process.env.SERPER_API_KEY || "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: query,
      gl: "mx",
      hl: "es",
    }),
  });

  const data = await response.json();
  console.log(`📦 Serper devolvió ${data.shopping?.length || 0} resultados`);
  return data.shopping || [];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Falta la llanta' }, { status: 400 });
  }

  try {
    console.log(`🔍 Iniciando búsqueda inteligente para: ${query}`);

    // 0. INVENTARIO LOCAL: Buscar en nuestro inventario primero
    const inventoryStore = InventoryStore.getInstance();
    const localMatches = inventoryStore.searchProducts(query);

    let avanteProduct = null;
    if (localMatches.length > 0) {
      avanteProduct = localMatches[0];
      console.log(`🏪 Producto encontrado en inventario local:`, {
        brand: avanteProduct.brand,
        model: avanteProduct.model,
        size: avanteProduct.size,
        price: avanteProduct.price
      });
    } else {
      console.log(`❌ No se encontró el producto en inventario local`);
    }

    // 1. LOS OJOS (Serper): Traemos datos reales de Google Shopping
    const allResults = await searchWithSerper(query);

    if (!allResults || allResults.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No se encontraron ofertas en Google Shopping."
      }, { status: 200 });
    }

    // 2. EL CEREBRO (Gemini): Analiza los resultados y elige los mejores
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      Eres un experto en el mercado de llantas en México. 
      Analiza la siguiente lista de productos de Google Shopping para la búsqueda: "${query}".
      
      Lista de productos: ${JSON.stringify(allResults.slice(0, 10))}

      Tu tarea:
      1. Identifica el producto de "Grupo Avante" o "Avante" (si existe).
      2. Identifica el mejor competidor (el más barato que NO sea Avante).
      3. Extrae las medidas de la llanta (ej: 205/55 R16).
      4. Para el competidor elegido, incluye el campo "link" exactamente como viene en la lista (URL del producto en la tienda).

      Responde ÚNICAMENTE en formato JSON con esta estructura:
      {
        "specs": "medida encontrada",
        "avante": {"found": true/false, "price": número, "title": "título"},
        "competitor": {"vendor": "nombre tienda", "price": número, "title": "título", "link": "url del producto"}
      }
    `;

    const result = await model.generateContent(prompt);
    const responseIA = JSON.parse(result.response.text().replace(/```json|```/g, ""));

    // Fallback: si Gemini no devolvió link, buscarlo en los resultados de Serper
    let competitorLink = responseIA.competitor?.link;
    if (!competitorLink && responseIA.competitor) {
      const match = allResults.find(
        (r: { link?: string; productLink?: string; source?: string; title?: string; price?: number }) =>
          (r.source === responseIA.competitor.vendor || (r.title && responseIA.competitor.title && String(r.title).includes(String(responseIA.competitor.title).slice(0, 30)))) &&
          (r.link || r.productLink)
      );
      competitorLink = match?.link || (match as { productLink?: string })?.productLink || null;
    }

    // 3. RESPUESTA FINAL - Priorizar inventario local sobre Google Shopping
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

    return NextResponse.json({
      success: true,
      mode: 'AI_OPTIMIZED',
      specsDetected: responseIA.specs,
      data: {
        product: responseIA.competitor?.title,
        avante: finalAvanteData,
        competitor: {
          vendor: responseIA.competitor?.vendor,
          price: responseIA.competitor?.price,
          title: responseIA.competitor?.title,
          link: competitorLink || null
        },
        currency: 'MXN',
        localInventoryChecked: true,
        localMatches: localMatches.length
      }
    });

  } catch (error) {
    console.error("Error en el motor de inteligencia:", error);
    return NextResponse.json({
      success: false,
      error: "Error procesando los datos con IA."
    }, { status: 500 });
  }
}