# Guía de Carga Masiva de Inventario

## 🎯 Funcionalidad Implementada

Sistema completo de carga masiva de inventario mediante archivos Excel (.xlsx/.xls) con normalización inteligente de columnas.

## 📁 Archivos Creados

### 1. Script de Generación de Datos
**Ubicación:** `scripts/generate_mock_data.js`

Genera un archivo Excel de prueba con 20 productos realistas:
- Llantas de camión (11R24.5, 11R22.5)
- Llantas de motocicleta (120/70-13, 140/70-17)
- Llantas de auto (205/55R16, 195/65R15, etc.)
- Llantas premium (245/40R18, 255/35R19)

**Uso:**
```bash
node scripts/generate_mock_data.js
```

**Salida:** `test_inventario.xlsx` en la raíz del proyecto

### 2. API Endpoint
**Ubicación:** `app/api/bulk/upload/route.ts`

**Características:**
- ✅ Acepta archivos Excel (.xlsx, .xls)
- ✅ Parsea Excel a JSON usando la librería `xlsx`
- ✅ Normalización inteligente de columnas
- ✅ Maneja múltiples variaciones de nombres de columnas

**Normalización de Columnas:**
```javascript
'Costo Promedio' → 'price'
'costo_promedio' → 'price'
'Costo'          → 'price'
'Precio'         → 'price'
'MEDIDA'         → 'size'
'Marca'          → 'brand'
'Modelo'         → 'model'
```

**Respuesta de la API:**
```json
{
  "success": true,
  "total": 20,
  "preview": [...], // Primeras 5 filas
  "data": [...],    // Todos los productos
  "originalColumns": ["SKU", "Marca", "Modelo", "MEDIDA", "Costo Promedio", "Stock"],
  "normalizedColumns": ["sku", "brand", "model", "size", "price", "stock"]
}
```

### 3. Interfaz de Usuario
**Ubicación:** `app/bulk/page.tsx`

**Características:**
- ✅ Drag & Drop de archivos Excel
- ✅ Selector de archivos tradicional
- ✅ Indicador de carga con animaciones
- ✅ Vista previa de las primeras 5 filas
- ✅ Tabla de mapeo de columnas (original → normalizada)
- ✅ Estadísticas del archivo procesado
- ✅ Diseño responsive con Tailwind CSS

**Acceso:** http://localhost:3000/bulk

## 🧪 Pruebas Realizadas

### Prueba 1: Generación de Datos Mock
```bash
$ node scripts/generate_mock_data.js
✅ Archivo test_inventario.xlsx generado exitosamente!
📊 Total de productos: 20
📍 Ubicación: ./test_inventario.xlsx
```

### Prueba 2: API de Carga
```bash
$ curl -X POST http://localhost:3000/api/bulk/upload \
  -F "file=@test_inventario.xlsx"

{
  "success": true,
  "total": 20,
  "preview": [
    {
      "sku": 1001,
      "brand": "Michelin",
      "model": "XZE",
      "size": "11R24.5",
      "price": 2689.53,
      "stock": 15
    },
    ...
  ]
}
```

### Prueba 3: Logs del Servidor
```
📦 Procesados 20 productos del Excel
📋 Columnas detectadas: [ 'SKU', 'Marca', 'Modelo', 'MEDIDA', 'Costo Promedio', 'Stock' ]
✅ Columnas normalizadas: [ 'sku', 'brand', 'model', 'size', 'price', 'stock' ]
POST /api/bulk/upload 200 in 3.7s
```

## 📊 Estructura del Excel de Prueba

| SKU  | Marca       | Modelo              | MEDIDA      | Costo Promedio | Stock |
|------|-------------|---------------------|-------------|----------------|-------|
| 1001 | Michelin    | XZE                 | 11R24.5     | 2689.53        | 15    |
| 1002 | Continental | HDR                 | 11R24.5     | 2550.00        | 8     |
| 1004 | Michelin    | Pilot Street        | 120/70-13   | 477.09         | 25    |
| 1008 | Michelin    | Primacy 4           | 205/55R16   | 1850.00        | 40    |
| 1018 | Michelin    | Pilot Sport 4       | 245/40R18   | 3200.00        | 15    |

## 🎨 Interfaz de Usuario

### Pantalla Principal
- Área de drag & drop con animaciones
- Indicador visual cuando se arrastra un archivo
- Botón de selección de archivo alternativo
- Información del archivo seleccionado (nombre, tamaño)

### Pantalla de Resultados
- ✅ Badge de éxito con estadísticas
- 📊 Grid con métricas (total productos, columnas, etc.)
- 🗺️ Tabla de mapeo de columnas (antes/después)
- 📋 Tabla de previsualización con las primeras 5 filas
- 🔄 Botón para cargar otro archivo

### Navegación
- Enlace "Carga Masiva" en el header de la página principal
- Botón "Volver al comparador" en la página de carga masiva

## 🔧 Dependencias Instaladas

```json
{
  "xlsx": "^0.18.5"
}
```

## 🚀 Próximos Pasos Sugeridos

1. **Integración con Base de Datos**
   - Guardar productos en PostgreSQL/MongoDB
   - Actualizar inventario existente

2. **Validaciones Avanzadas**
   - Validar formato de medidas de llantas
   - Verificar duplicados por SKU
   - Validar rangos de precios

3. **Búsqueda Automática**
   - Integrar con la API de Serper
   - Buscar cada producto en Google Shopping
   - Comparar precios automáticamente

4. **Exportación de Resultados**
   - Generar reporte Excel con comparaciones
   - Exportar productos con alertas de precio

5. **Historial de Cargas**
   - Guardar registro de archivos procesados
   - Mostrar historial de cargas anteriores

## ✅ Estado Final

- ✅ Script de generación de datos funcionando
- ✅ API de carga y parseo funcionando
- ✅ Normalización inteligente de columnas funcionando
- ✅ Interfaz de usuario completa y responsive
- ✅ Drag & Drop implementado
- ✅ Vista previa de datos funcionando
- ✅ Sin errores de TypeScript
- ✅ Integración con la página principal

**Todo listo para producción!** 🎉
