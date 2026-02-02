import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import InventoryStore from '../../../../lib/inventory-store';

// Función para detectar la fila de headers automáticamente
function findHeaderRow(worksheet: XLSX.WorkSheet): number {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
  const headerKeywords = ['sku', 'marca', 'modelo', 'medida'];
  
  // Buscar en las primeras 10 filas
  for (let row = range.s.r; row <= Math.min(range.e.r, 9); row++) {
    const cellsInRow: string[] = [];
    
    // Leer todas las columnas de esta fila
    for (let col = range.s.c; col <= range.e.c; col++) {
      const addr = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[addr];
      if (cell?.v) {
        cellsInRow.push(String(cell.v).toLowerCase());
      }
    }
    
    // Debe encontrar AL MENOS 3 de las 4 keywords
    const matchCount = headerKeywords.filter(kw => 
      cellsInRow.some(cell => cell.includes(kw))
    ).length;
    
    if (matchCount >= 3) {
      console.log(`✅ Headers encontrados en fila ${row + 1}:`, cellsInRow);
      return row;
    }
  }
  
  console.log('⚠️ Headers no encontrados, usando fila 0');
  return 0;
}

// Función para normalizar nombres de columnas (ACTUALIZADA)
function normalizeColumnName(col: string): string {
  const normalized = col.toLowerCase().trim().replace(/\s+/g, '_').replace(/[()$]/g, '');
  
  // Mapeo de columnas del Excel maestro de Llantas Avante
  const mappings: Record<string, string> = {
    // Mapeos originales
    'costo_promedio': 'price',
    'costo': 'cost',
    'precio': 'price',
    'medida': 'size',
    'modelo': 'model',
    'marca': 'brand',
    
    // Mapeos específicos del Excel maestro
    'precio_de_venta_': 'price',
    'precio_de_venta': 'price',
    'costo_de_adquisición_': 'cost',
    'costo_de_adquisicion_': 'cost',
    'costo_de_adquisición': 'cost',
    'costo_de_adquisicion': 'cost',
    'stock_total': 'stock',
    'precio_competencia_': 'competitorPrice',
    'precio_competencia': 'competitorPrice',
    'margen_de_contribución_': 'margin',
    'margen_de_contribucion_': 'margin',
    'margen_de_contribución': 'margin',
    'margen_de_contribucion': 'margin',
    'tipo_de_vehículo': 'vehicleType',
    'tipo_de_vehiculo': 'vehicleType',
  };
  
  return mappings[normalized] || normalized;
}

// Función para normalizar un objeto completo
function normalizeProduct(product: any) {
  const normalized: any = {};
  
  for (const [key, value] of Object.entries(product)) {
    if (value !== null && value !== undefined && value !== '') {
      const normalizedKey = normalizeColumnName(key);
      normalized[normalizedKey] = value;
    }
  }
  
  return normalized;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    }

    // Convertir el archivo a buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Leer el Excel
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Detectar automáticamente la fila de headers
    const headerRow = findHeaderRow(worksheet);
    
    // Convertir a JSON empezando desde la fila de headers detectada
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      range: headerRow,
      defval: '' // Valor por defecto para celdas vacías
    });
    
    if (!rawData || rawData.length === 0) {
      return NextResponse.json({ error: 'El archivo está vacío o no contiene datos válidos' }, { status: 400 });
    }

    // Filtrar filas vacías y normalizar productos
    const validData = rawData.filter((row: any) => {
      // Verificar que la fila tenga al menos un campo con datos
      return Object.values(row).some(value => value && value.toString().trim() !== '');
    });

    const normalizedData = validData.map(normalizeProduct);

    // Cargar datos en el store de inventario
    const inventoryStore = InventoryStore.getInstance();
    inventoryStore.loadInventory(normalizedData);

    console.log(`📦 Procesados ${normalizedData.length} productos del Excel`);
    console.log(`📋 Columnas detectadas:`, Object.keys(rawData[0] as object));
    console.log(`✅ Columnas normalizadas:`, Object.keys(normalizedData[0]));

    // Llamar al análisis automático
    console.log(`🚀 Iniciando análisis masivo automático...`);
    
    try {
      const analyzeResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/bulk/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: normalizedData })
      });
      
      const analysisResults = await analyzeResponse.json();
      
      return NextResponse.json({
        success: true,
        total: normalizedData.length,
        preview: normalizedData.slice(0, 5),
        data: normalizedData,
        originalColumns: Object.keys(rawData[0] as object),
        normalizedColumns: Object.keys(normalizedData[0]),
        headerRowDetected: headerRow + 1,
        inventoryLoaded: true,
        analysis: analysisResults.results || [],
        analysisSuccess: analysisResults.success
      });
      
    } catch (analysisError) {
      console.error('Error en análisis automático:', analysisError);
      
      // Si falla el análisis, devolver datos básicos
      return NextResponse.json({
        success: true,
        total: normalizedData.length,
        preview: normalizedData.slice(0, 5),
        data: normalizedData,
        originalColumns: Object.keys(rawData[0] as object),
        normalizedColumns: Object.keys(normalizedData[0]),
        headerRowDetected: headerRow + 1,
        inventoryLoaded: true,
        analysis: [],
        analysisSuccess: false,
        analysisError: 'Error en análisis automático'
      });
    }

  } catch (error) {
    console.error('Error procesando Excel:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al procesar el archivo Excel'
    }, { status: 500 });
  }
}
