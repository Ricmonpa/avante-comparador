# 🚀 Avante Comparador - Análisis Masivo de Inventario

Sistema inteligente de comparación de precios que analiza automáticamente todo tu inventario vs la competencia.

## ✨ Funcionalidades

### 🔍 Análisis Masivo Automático
- **Sube tu Excel** → Análisis automático de todos los productos
- **Detección inteligente** de headers (funciona con cualquier formato)
- **Comparación en tiempo real** con Google Shopping
- **Clasificación automática**: Más caro 🔴 | Competitivo ✅ | Más barato 🟢

### 📊 Tabla de Resultados Completa
- Vista comparativa de tu precio vs mejor competencia
- Filtros por estado de precio
- Links directos para verificar competencia
- Recomendaciones de acción automáticas
- Exportación a Excel

### 🎯 Buscador Individual
- Búsquedas rápidas de productos específicos
- Integración con inventario local
- Comparación instantánea con competencia

## 🛠️ Stack Técnico

- **Framework:** Next.js 16.1.1 (App Router)
- **Frontend:** React 19, TypeScript, Tailwind CSS
- **APIs:** Serper.dev + Google Gemini AI
- **Procesamiento:** xlsx, inventario en memoria

## 🚀 Deployment en Vercel

### 1. Variables de Entorno Requeridas

En tu dashboard de Vercel, configura estas variables:

```bash
SERPER_API_KEY=tu_llave_de_serper_aqui
GEMINI_API_KEY=tu_llave_de_gemini_aqui
```

### 2. Obtener API Keys (GRATIS)

#### Serper API (Google Shopping)
1. Ve a [serper.dev](https://serper.dev)
2. Regístrate gratis
3. Obtén tu API key (2,500 búsquedas gratis)

#### Google Gemini AI
1. Ve a [Google AI Studio](https://aistudio.google.com/)
2. Regístrate gratis
3. Crea una API key

### 3. Deploy Automático

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Ricmonpa/avante-comparador)

O manualmente:
```bash
npm i -g vercel
vercel --prod
```

## 📈 Rendimiento

- **13 segundos** para analizar 7 productos completos
- **Procesamiento paralelo** optimizado (máx 5 búsquedas simultáneas)
- **Headers detectados automáticamente** en cualquier fila
- **Búsquedas en tiempo real** con Google Shopping

## 🎯 Casos de Uso

### Para Llantas Avante:
- ✅ Identifica productos sobrepreciados que necesitas bajar
- ✅ Encuentra productos competitivos que puedes mantener
- ✅ Descubre productos subpreciados con oportunidad de alza
- ✅ Ahorra horas de búsqueda manual producto por producto

### Ejemplo de Análisis:
```
Michelin Primacy 4 205/55R16
Tu precio: $2,200 vs Liverpool: $2,229 → Competitivo ✅

Continental ContiPremiumContact 205/55R16  
Tu precio: $2,100 vs Bodega Aurrera: $1,599 → Más caro 🔴 (Bajar precio)
```

## 🔒 Seguridad

- ✅ API keys protegidas con variables de entorno
- ✅ No se almacenan datos sensibles
- ✅ Procesamiento en memoria temporal
- ✅ HTTPS en todas las comunicaciones

## 📱 Responsive Design

- ✅ Optimizado para desktop y móvil
- ✅ Drag & drop de archivos Excel
- ✅ Tablas responsivas con scroll horizontal
- ✅ UI moderna con Tailwind CSS

## 🚀 Desarrollo Local

```bash
# Clonar repositorio
git clone https://github.com/Ricmonpa/avante-comparador.git
cd avante-comparador

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus API keys

# Iniciar servidor de desarrollo
npm run dev
```

## 📊 Estructura del Proyecto

```
avante-comparador/
├── app/
│   ├── api/
│   │   ├── bulk/
│   │   │   ├── upload/route.ts    # Parser de Excel + análisis
│   │   │   └── analyze/route.ts   # Análisis masivo
│   │   └── scrape/route.ts        # Búsqueda individual
│   ├── bulk/page.tsx              # Página de análisis masivo
│   └── page.tsx                   # Página principal
├── components/
│   ├── BulkResultsTable.tsx       # Tabla de resultados
│   └── ProgressBar.tsx            # Barra de progreso
├── lib/
│   └── inventory-store.ts         # Almacenamiento en memoria
└── scripts/
    └── generate_mock_data.js      # Generador de datos de prueba
```

## 🎉 Demo

**URL de producción:** [Será generada por Vercel]

**Funcionalidades de demo:**
1. Sube el Excel de inventario
2. Ve el análisis automático en tiempo real
3. Explora la tabla de resultados con filtros
4. Prueba el buscador individual

---

**Desarrollado para Llantas Avante** 🏪  
*Análisis inteligente de competencia automatizado*
