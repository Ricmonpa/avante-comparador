import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// Función para detectar la fila de headers automáticamente
function findHeaderRow(worksheet: XLSX.WorkSheet): number {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
  // Palabras clave que identifican la fila de encabezados
  const mustHave = ['marca', 'medida'];
  const optional = ['sku', 'modelo', 'precio', 'costo', 'neto', 'descripcion'];

  for (let row = range.s.r; row <= Math.min(range.e.r, 9); row++) {
    const cellsInRow: string[] = [];

    for (let col = range.s.c; col <= range.e.c; col++) {
      const addr = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[addr];
      if (cell?.v) cellsInRow.push(String(cell.v).toLowerCase().trim());
    }

    // Debe tener al menos las 2 palabras clave obligatorias
    const hasMust = mustHave.every(kw => cellsInRow.some(c => c.includes(kw)));
    if (hasMust) {
      console.log(`✅ Headers encontrados en fila ${row + 1}:`, cellsInRow);
      return row;
    }

    // O al menos 3 de las opcionales
    const optionalCount = optional.filter(kw => cellsInRow.some(c => c.includes(kw))).length;
    if (optionalCount >= 3) {
      console.log(`✅ Headers detectados (${optionalCount} palabras) en fila ${row + 1}:`, cellsInRow);
      return row;
    }
  }

  console.log('⚠️ Headers no encontrados, usando fila 0');
  return 0;
}

// Mapeo de nombres de columnas a campos estándar
function normalizeColumnName(col: string): string {
  const normalized = col
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[()$áéíóúüñ]/g, c =>
      ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n' }[c] ?? '')
    );

  const mappings: Record<string, string> = {
    // Identificadores
    'sku': 'sku',
    'codigo': 'sku',
    'clave': 'sku',
    'id': 'sku',

    // Marca / Modelo / Medida
    'marca': 'brand',
    'modelo': 'model',
    'medida': 'size',
    'descripcion': 'model',
    'description': 'model',

    // Precios
    'precio': 'price',
    'precio_de_venta': 'price',
    'precio_de_venta_': 'price',
    'pvp': 'price',
    'neto': 'price',           // ← Excel de Avante usa "Neto"

    // Costo
    'costo': 'cost',
    'costo_promedio': 'cost',
    'costo_de_adquisicion': 'cost',
    'costo_de_adquisicion_': 'cost',

    // Stock
    'stock': 'stock',
    'stock_total': 'stock',
    'existencias': 'stock',
    'inventario': 'stock',

    // Margen
    'margen': 'margin',
    'margen_de_contribucion': 'margin',
    'margen_de_contribucion_': 'margin',

    // Tipo de vehículo
    'tipo_de_vehiculo': 'vehicleType',
    'tipo': 'vehicleType',
    'clase': 'clase',  // campo informativo, no se usa en análisis
  };

  return mappings[normalized] ?? normalized;
}

function normalizeProduct(raw: any, index: number) {
  const out: any = {};

  for (const [key, value] of Object.entries(raw)) {
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      const k = normalizeColumnName(key);
      out[k] = value;
    }
  }

  // Convertir precio y costo a número si vienen como string
  if (out.price && typeof out.price === 'string') {
    out.price = parseFloat(out.price.replace(/[,$]/g, '')) || 0;
  }
  if (out.cost && typeof out.cost === 'string') {
    out.cost = parseFloat(out.cost.replace(/[,$]/g, '')) || 0;
  }

  // Auto-generar SKU si no existe
  if (!out.sku) {
    const brand = String(out.brand || '').slice(0, 3).toUpperCase();
    const size = String(out.size || '').replace(/[^0-9R]/gi, '');
    out.sku = `${brand}-${size}-${String(index + 1).padStart(3, '0')}`;
  }

  return out;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const headerRow = findHeaderRow(worksheet);

    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      range: headerRow,
      defval: '',
    }) as any[];

    if (!rawData || rawData.length === 0) {
      return NextResponse.json(
        { error: 'El archivo está vacío o no contiene datos válidos' },
        { status: 400 }
      );
    }

    // Filtrar filas completamente vacías
    const validData = rawData.filter(row =>
      Object.values(row).some(v => v && String(v).trim() !== '')
    );

    const products = validData.map((row, i) => normalizeProduct(row, i));

    // Filtrar productos sin precio ni marca (inútiles para análisis)
    const usable = products.filter(p => p.brand || p.size);

    console.log(`📦 Excel procesado: ${usable.length} productos útiles de ${rawData.length} filas`);
    console.log(`📋 Columnas originales:`, Object.keys(rawData[0]));
    console.log(`✅ Columnas normalizadas:`, Object.keys(products[0] || {}));

    // Devolver solo los productos; el análisis lo hace el cliente
    return NextResponse.json({
      success: true,
      total: usable.length,
      products: usable,
      originalColumns: Object.keys(rawData[0]),
      normalizedColumns: Object.keys(products[0] || {}),
      headerRowDetected: headerRow + 1,
    });
  } catch (error) {
    console.error('Error procesando Excel:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar el archivo Excel' },
      { status: 500 }
    );
  }
}
