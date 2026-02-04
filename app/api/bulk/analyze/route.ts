import { NextResponse } from 'next/server';

// Función para procesar en lotes con límite de concurrencia
async function processBatch(products: any[], batchSize: number = 5) {
  const results = [];
  
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (product) => {
        try {
          const query = `${product.brand} ${product.model} ${product.size}`;
          // Usar la URL base correcta de Vercel
          const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://avante-comparador.vercel.app';
          const response = await fetch(`${baseUrl}/api/scrape?q=${encodeURIComponent(query)}`);
          const data = await response.json();
          
          if (!data.success) {
            return {
              ...product,
              status: 'error',
              error: 'No se encontraron resultados'
            };
          }
          
          const competitorPrice = data.data.competitor.price;
          const difference = product.price - competitorPrice;
          
          let status = 'competitive';
          if (difference > 500) status = 'overpriced';
          if (difference < -500) status = 'underpriced';
          
          return {
            sku: product.sku,
            brand: product.brand,
            model: product.model,
            size: product.size,
            yourPrice: product.price,
            bestCompetitorPrice: competitorPrice,
            competitorVendor: data.data.competitor.vendor,
            difference: difference,
            status: status,
            recommendation: status === 'overpriced' ? 'Bajar precio' : status === 'underpriced' ? 'Oportunidad de alza' : 'Mantener',
            competitorUrl: `https://www.google.com/search?q=${encodeURIComponent(query)}`
          };
        } catch (error: any) {
          return {
            ...product,
            status: 'error',
            error: error.message
          };
        }
      })
    );
    
    results.push(...batchResults);
    
    // Log de progreso
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
      results: results
    });
    
  } catch (error) {
    console.error('Error en análisis masivo:', error);
    return NextResponse.json({
      success: false,
      error: 'Error procesando análisis masivo'
    }, { status: 500 });
  }
}