import { NextResponse } from 'next/server';
import type { AnalysisResult, CompetitorInfo } from '../../../../types';

// Aumentar timeout en Vercel Pro para inventarios grandes
export const maxDuration = 300;

// Extrae el tiempo de espera real del error 429 de Gemini ("retry in 12s")
function extractRetryDelay(error: any): number {
  const msg = String(error?.message || error || '');
  const match = msg.match(/retry in (\d+)s/i);
  return match ? parseInt(match[1], 10) * 1000 + 1000 : 20000; // +1s de buffer
}

async function withRetry<T>(fn: () => Promise<T>, retries = 4): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      if (i === retries - 1) throw e;
      // Para 429 (rate limit), respetar el tiempo que indica la API
      const is429 = String(e?.message || e).includes('429');
      const delay = is429 ? extractRetryDelay(e) : 1000 * Math.pow(2, i);
      console.log(`⏳ Retry ${i + 1}/${retries - 1} en ${Math.round(delay / 1000)}s${is429 ? ' (rate limit)' : ''}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Max retries reached');
}

// Procesamos de a 2 productos en paralelo para no saturar el rate limit de Gemini.
// Entre cada tanda esperamos 3s para que la cuota se recupere.
async function processBatch(products: any[], batchSize: number = 2) {
  const results: AnalysisResult[] = [];
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const BATCH_DELAY_MS = 3000; // pausa entre tandas

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (product): Promise<AnalysisResult> => {
        try {
          // Filtrar undefined/null para no generar queries como "BRAND undefined SIZE"
          const query = [product.brand, product.model, product.size]
            .filter(v => v !== undefined && v !== null && String(v).trim() !== '')
            .join(' ')
            .trim();

          if (!query) {
            return {
              sku: product.sku,
              brand: product.brand,
              model: product.model,
              size: product.size,
              vehicleType: product.vehicleType,
              yourPrice: product.price,
              cost: product.cost,
              margin: product.margin,
              bestCompetitorPrice: 0,
              competitorVendor: '',
              competitors: [],
              difference: 0,
              differencePercent: 0,
              status: 'error' as const,
              recommendation: 'Faltan datos (marca/medida)',
              competitorUrl: '',
              competitorLink: null,
              error: 'Sin marca ni medida para buscar',
            };
          }

          const data = await withRetry(() =>
            fetch(`${baseUrl}/api/scrape?q=${encodeURIComponent(query)}`).then(r => r.json())
          );

          if (!data.success) {
            return {
              sku: product.sku,
              brand: product.brand,
              model: product.model,
              size: product.size,
              vehicleType: product.vehicleType,
              yourPrice: product.price,
              cost: product.cost,
              margin: product.margin,
              bestCompetitorPrice: 0,
              competitorVendor: '',
              competitors: [],
              difference: 0,
              differencePercent: 0,
              status: 'error',
              recommendation: 'Sin datos de competencia',
              competitorUrl: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
              competitorLink: null,
              error: 'No se encontraron resultados',
            };
          }

          const bestCompetitor = data.data.competitor;
          const competitorPrice: number = bestCompetitor?.price || 0;
          const difference = product.price - competitorPrice;
          const differencePercent = competitorPrice > 0
            ? ((product.price - competitorPrice) / competitorPrice) * 100
            : 0;

          let status: AnalysisResult['status'] = 'competitive';
          if (difference > 500) status = 'overpriced';
          if (difference < -500) status = 'underpriced';

          // Precio sugerido para ser competitivo manteniendo margen mínimo del 10%
          let suggestedPrice: number | undefined;
          if (status === 'overpriced' && competitorPrice > 0) {
            const rawSuggested = competitorPrice * 0.98;
            const minPrice = product.cost ? product.cost * 1.10 : 0;
            suggestedPrice = Math.round(Math.max(rawSuggested, minPrice));
          }

          const recommendation =
            status === 'overpriced'
              ? suggestedPrice
                ? `Bajar a $${suggestedPrice.toLocaleString()} para ser competitivo`
                : 'Bajar precio'
              : status === 'underpriced'
              ? 'Oportunidad de alza'
              : 'Mantener precio';

          const competitors: CompetitorInfo[] = data.data.competitors || (
            bestCompetitor ? [bestCompetitor] : []
          );

          return {
            sku: product.sku,
            brand: product.brand,
            model: product.model,
            size: product.size,
            vehicleType: product.vehicleType,
            yourPrice: product.price,
            cost: product.cost,
            margin: product.margin,
            bestCompetitorPrice: competitorPrice,
            competitorVendor: bestCompetitor?.vendor || '',
            competitors,
            difference,
            differencePercent,
            status,
            recommendation,
            suggestedPrice,
            competitorUrl: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
            competitorLink: bestCompetitor?.link || null,
          };
        } catch (error: any) {
          return {
            sku: product.sku,
            brand: product.brand,
            model: product.model,
            size: product.size,
            vehicleType: product.vehicleType,
            yourPrice: product.price,
            cost: product.cost,
            margin: product.margin,
            bestCompetitorPrice: 0,
            competitorVendor: '',
            competitors: [],
            difference: 0,
            differencePercent: 0,
            status: 'error',
            recommendation: 'Error al obtener datos',
            competitorUrl: '',
            competitorLink: null,
            error: error.message,
          };
        }
      })
    );

    results.push(...batchResults);
    console.log(`📊 Procesados ${results.length}/${products.length} productos`);

    // Pausa entre tandas para respetar el rate limit de Gemini
    if (i + batchSize < products.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  return results;
}

export async function POST(request: Request) {
  try {
    const { products } = await request.json();

    if (!products || !Array.isArray(products)) {
      return NextResponse.json({ error: 'Productos inválidos' }, { status: 400 });
    }

    console.log(`🚀 Iniciando análisis masivo de ${products.length} productos`);

    const results = await processBatch(products);

    return NextResponse.json({
      success: true,
      totalProcessed: results.length,
      results,
    });

  } catch (error) {
    console.error('Error en análisis masivo:', error);
    return NextResponse.json({
      success: false,
      error: 'Error procesando análisis masivo'
    }, { status: 500 });
  }
}
