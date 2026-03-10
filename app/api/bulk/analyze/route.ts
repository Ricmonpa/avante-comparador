import { NextResponse } from 'next/server';
import type { AnalysisResult, CompetitorInfo } from '../../../../types';

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries reached');
}

async function processBatch(products: any[], batchSize: number = 5) {
  const results: AnalysisResult[] = [];
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (product): Promise<AnalysisResult> => {
        try {
          const query = `${product.brand} ${product.model} ${product.size}`;
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
