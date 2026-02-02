const XLSX = require('xlsx');

// Simular el Excel maestro de Llantas Avante con headers en fila 3
const mockData = [
  // Fila 1: Título merged
  { '🏪  LLANTAS AVANTE — CATÁLOGO MAESTRO DE SKUs': '' },
  
  // Fila 2: Subtítulo
  { 'Inventario actualizado al 29 de Enero 2025': '' },
  
  // Fila 3: Headers reales (esta es la que debe detectar)
  {
    'SKU': 'SKU',
    'Marca': 'Marca', 
    'Modelo': 'Modelo',
    'MEDIDA': 'MEDIDA',
    'Tipo de Vehículo': 'Tipo de Vehículo',
    'Costo de Adquisición ($)': 'Costo de Adquisición ($)',
    'Precio de Venta ($)': 'Precio de Venta ($)',
    'Stock Total': 'Stock Total',
    'Precio Competencia ($)': 'Precio Competencia ($)',
    'Margen de Contribución ($)': 'Margen de Contribución ($)'
  }
];

// Datos reales empezando desde fila 4
const realData = [
  {
    'SKU': 'AV001',
    'Marca': 'Michelin',
    'Modelo': 'Primacy 4',
    'MEDIDA': '205/55R16',
    'Tipo de Vehículo': 'Auto',
    'Costo de Adquisición ($)': 1650.00,
    'Precio de Venta ($)': 2200.00,
    'Stock Total': 25,
    'Precio Competencia ($)': 2350.00,
    'Margen de Contribución ($)': 550.00
  },
  {
    'SKU': 'AV002',
    'Marca': 'Continental',
    'Modelo': 'ContiPremiumContact',
    'MEDIDA': '205/55R16',
    'Tipo de Vehículo': 'Auto',
    'Costo de Adquisición ($)': 1580.00,
    'Precio de Venta ($)': 2100.00,
    'Stock Total': 18,
    'Precio Competencia ($)': 2250.00,
    'Margen de Contribución ($)': 520.00
  },
  {
    'SKU': 'AV003',
    'Marca': 'Pirelli',
    'Modelo': 'Cinturato P7',
    'MEDIDA': '225/45R17',
    'Tipo de Vehículo': 'Auto',
    'Costo de Adquisición ($)': 1850.00,
    'Precio de Venta ($)': 2450.00,
    'Stock Total': 12,
    'Precio Competencia ($)': 2600.00,
    'Margen de Contribución ($)': 600.00
  },
  {
    'SKU': 'AV004',
    'Marca': 'Michelin',
    'Modelo': 'XZE',
    'MEDIDA': '11R24.5',
    'Tipo de Vehículo': 'Camión',
    'Costo de Adquisición ($)': 2400.00,
    'Precio de Venta ($)': 3200.00,
    'Stock Total': 8,
    'Precio Competencia ($)': 3400.00,
    'Margen de Contribución ($)': 800.00
  },
  {
    'SKU': 'AV005',
    'Marca': 'Bridgestone',
    'Modelo': 'R268',
    'MEDIDA': '11R22.5',
    'Tipo de Vehículo': 'Camión',
    'Costo de Adquisición ($)': 2600.00,
    'Precio de Venta ($)': 3450.00,
    'Stock Total': 6,
    'Precio Competencia ($)': 3600.00,
    'Margen de Contribución ($)': 850.00
  },
  {
    'SKU': 'AV006',
    'Marca': 'Pirelli',
    'Modelo': 'Diablo Rosso',
    'MEDIDA': '120/70-17',
    'Tipo de Vehículo': 'Motocicleta',
    'Costo de Adquisición ($)': 950.00,
    'Precio de Venta ($)': 1350.00,
    'Stock Total': 30,
    'Precio Competencia ($)': 1450.00,
    'Margen de Contribución ($)': 400.00
  },
  {
    'SKU': 'AV007',
    'Marca': 'Michelin',
    'Modelo': 'Pilot Street',
    'MEDIDA': '110/70-13',
    'Tipo de Vehículo': 'Motocicleta',
    'Costo de Adquisición ($)': 380.00,
    'Precio de Venta ($)': 520.00,
    'Stock Total': 45,
    'Precio Competencia ($)': 580.00,
    'Margen de Contribución ($)': 140.00
  }
];

// Combinar todo el contenido
const allData = [...mockData, ...realData];

// Crear el workbook manualmente para controlar la estructura exacta
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(allData, { skipHeader: true });

// Ajustar anchos de columna
ws['!cols'] = [
  { wch: 8 },   // SKU
  { wch: 15 },  // Marca
  { wch: 25 },  // Modelo
  { wch: 15 },  // MEDIDA
  { wch: 18 },  // Tipo de Vehículo
  { wch: 20 },  // Costo de Adquisición
  { wch: 18 },  // Precio de Venta
  { wch: 12 },  // Stock Total
  { wch: 20 },  // Precio Competencia
  { wch: 25 },  // Margen de Contribución
];

XLSX.utils.book_append_sheet(wb, ws, 'Inventario Maestro');

// Guardar archivo
XLSX.writeFile(wb, 'test_inventario_maestro.xlsx');

console.log('✅ Archivo test_inventario_maestro.xlsx generado exitosamente!');
console.log('📊 Estructura simulada:');
console.log('  - Fila 1: Título merged (🏪 LLANTAS AVANTE — CATÁLOGO MAESTRO DE SKUs)');
console.log('  - Fila 2: Subtítulo (Inventario actualizado...)');
console.log('  - Fila 3: Headers reales (SKU, Marca, Modelo, etc.)');
console.log('  - Fila 4+: Datos reales');
console.log(`📍 Total de productos: ${realData.length}`);
console.log('📍 Ubicación: ./test_inventario_maestro.xlsx');
