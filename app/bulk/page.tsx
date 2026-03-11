"use client";

import { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import BulkResultsTable from '../../components/BulkResultsTable';
import ProgressBar from '../../components/ProgressBar';
import type { AnalysisResult, CompetitorInfo } from '../../types';

// ---------------------------------------------------------------------------
// Lógica de análisis (igual que en analyze/route.ts pero ejecutada en browser)
// ---------------------------------------------------------------------------
function buildAnalysisResult(product: any, scrapeData: any, query: string): AnalysisResult {
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

  if (!scrapeData?.success) {
    return {
      sku: product.sku || '',
      brand: product.brand || '',
      model: product.model || '',
      size: product.size || '',
      vehicleType: product.vehicleType,
      yourPrice: Number(product.price) || 0,
      cost: product.cost ? Number(product.cost) : undefined,
      margin: product.margin ? Number(product.margin) : undefined,
      bestCompetitorPrice: 0,
      competitorVendor: '',
      competitors: [],
      difference: 0,
      differencePercent: 0,
      status: 'error',
      recommendation: 'Sin datos de competencia',
      competitorUrl: googleUrl,
      competitorLink: null,
      error: scrapeData?.error || 'No se encontraron resultados',
    };
  }

  const bestCompetitor = scrapeData.data?.competitor;
  const yourPrice = Number(product.price) || 0;
  const competitorPrice = bestCompetitor?.price || 0;
  const difference = yourPrice - competitorPrice;
  const differencePercent = competitorPrice > 0
    ? ((yourPrice - competitorPrice) / competitorPrice) * 100
    : 0;

  let status: AnalysisResult['status'] = 'competitive';
  if (difference > 500) status = 'overpriced';
  if (difference < -500) status = 'underpriced';

  let suggestedPrice: number | undefined;
  if (status === 'overpriced' && competitorPrice > 0) {
    const rawSuggested = competitorPrice * 0.98;
    const minPrice = product.cost ? Number(product.cost) * 1.10 : 0;
    suggestedPrice = Math.round(Math.max(rawSuggested, minPrice));
  }

  const recommendation =
    status === 'overpriced'
      ? (suggestedPrice ? `Bajar a $${suggestedPrice.toLocaleString()} para ser competitivo` : 'Bajar precio')
      : status === 'underpriced'
      ? 'Oportunidad de alza'
      : 'Mantener precio';

  const competitors: CompetitorInfo[] = scrapeData.data?.competitors
    || (bestCompetitor ? [bestCompetitor] : []);

  return {
    sku: product.sku || '',
    brand: product.brand || '',
    model: product.model || '',
    size: product.size || '',
    vehicleType: product.vehicleType,
    yourPrice,
    cost: product.cost ? Number(product.cost) : undefined,
    margin: product.margin ? Number(product.margin) : undefined,
    bestCompetitorPrice: competitorPrice,
    competitorVendor: bestCompetitor?.vendor || '',
    competitors,
    difference,
    differencePercent,
    status,
    recommendation,
    suggestedPrice,
    competitorUrl: googleUrl,
    competitorLink: bestCompetitor?.link || null,
  };
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
type Phase = 'idle' | 'uploading' | 'analyzing' | 'done';

export default function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) {
      setFile(f); setError(''); setResults([]);
    } else {
      setError('Por favor sube un archivo Excel (.xlsx o .xls)');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setError(''); setResults([]); }
  };

  // ─── Procesamiento principal ─────────────────────────────────────────────
  const handleUpload = useCallback(async () => {
    if (!file) { setError('Selecciona un archivo primero'); return; }

    abortRef.current = false;
    setPhase('uploading');
    setError('');
    setResults([]);
    setProgress({ current: 0, total: 0 });

    try {
      // ── Fase 1: parsear Excel (rápido, <1s) ─────────────────────────────
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/bulk/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Error procesando el archivo');

      const products: any[] = data.products;
      setTotalProducts(products.length);
      setPhase('analyzing');
      setProgress({ current: 0, total: products.length });

      // ── Fase 2: deduplicar queries para no llamar la API dos veces ───────
      // La query es SOLO "MARCA MEDIDA" — la DESCRIPCION tiene SKUs numéricos
      // que confunden a Google Shopping y arruinan los resultados.
      // Así 174 productos colapsan a ~20-30 queries únicas.
      const queryGroups = new Map<string, number[]>(); // query → índices de productos
      products.forEach((p, i) => {
        const q = [p.brand, p.size]
          .filter(v => v && String(v).trim() !== '')
          .join(' ')
          .trim()
          .toUpperCase();
        if (!queryGroups.has(q)) queryGroups.set(q, []);
        queryGroups.get(q)!.push(i);
      });

      const uniqueQueries = Array.from(queryGroups.entries()); // [query, indices[]]
      console.log(`🔢 ${products.length} productos → ${uniqueQueries.length} queries únicas (deduplicadas)`);
      // Actualizar total para que el progress bar cuente bien
      setProgress({ current: 0, total: products.length });
      const accumulated: AnalysisResult[] = new Array(products.length);
      let processedCount = 0;

      // ── Fase 3: procesar 2 queries en paralelo con pausa entre tandas ────
      const BATCH = 2;
      const DELAY_MS = 2000;

      for (let b = 0; b < uniqueQueries.length; b += BATCH) {
        if (abortRef.current) break;

        const batchEntries = uniqueQueries.slice(b, b + BATCH);

        await Promise.all(
          batchEntries.map(async ([query, indices]) => {
            let scrapeData: any = null;
            try {
              const r = await fetch(`/api/scrape?q=${encodeURIComponent(query)}`);
              scrapeData = await r.json();
            } catch {
              scrapeData = { success: false, error: 'Error de red' };
            }

            // Aplicar el mismo resultado a todos los productos de este query
            // (cada uno con su propio precio "yourPrice")
            indices.forEach(i => {
              accumulated[i] = buildAnalysisResult(products[i], scrapeData, query);
            });

            processedCount += indices.length;
            setProgress({ current: processedCount, total: products.length });
            // Mostrar resultados parciales en tiempo real
            setResults([...accumulated].filter(Boolean) as AnalysisResult[]);
          })
        );

        // Pausa entre tandas para respetar rate limit de Gemini
        if (b + BATCH < uniqueQueries.length) {
          await new Promise(r => setTimeout(r, DELAY_MS));
        }
      }

      setPhase('done');
    } catch (err: any) {
      setError(err.message || 'Error al procesar el archivo');
      setPhase('idle');
    }
  }, [file]);

  // ─── Si hay resultados, mostrar tabla ────────────────────────────────────
  if (phase === 'done' || (phase === 'analyzing' && results.length > 0)) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
        <header className="max-w-6xl mx-auto mb-8">
          <button
            onClick={() => { setPhase('idle'); setResults([]); setFile(null); }}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={18} />
            Volver al comparador
          </button>
          <div className="flex items-center justify-between border-b border-slate-800 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl flex items-center justify-center shadow-lg shadow-purple-900/20">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {phase === 'analyzing' ? '⏳ Analizando inventario…' : '✅ Análisis Completado'}
                </h1>
                <p className="text-slate-400 text-sm">
                  {results.length} de {totalProducts} productos analizados
                </p>
              </div>
            </div>
            {phase === 'analyzing' && (
              <button
                onClick={() => { abortRef.current = true; setPhase('done'); }}
                className="text-slate-500 hover:text-white text-sm px-4 py-2 rounded-lg border border-slate-700 transition-colors"
              >
                Detener y ver resultados
              </button>
            )}
          </div>
        </header>

        <div className="max-w-6xl mx-auto space-y-4">
          {phase === 'analyzing' && (
            <ProgressBar
              current={progress.current}
              total={progress.total}
              message="Comparando cada producto con Google Shopping…"
            />
          )}
          <BulkResultsTable results={results} totalProcessed={totalProducts} />
        </div>
      </main>
    );
  }

  // ─── Pantalla principal ───────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <header className="max-w-6xl mx-auto mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4">
          <ArrowLeft size={18} />
          Volver al comparador
        </Link>
        <div className="flex items-center gap-3 border-b border-slate-800 pb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl flex items-center justify-center shadow-lg shadow-purple-900/20">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">🚀 Análisis Masivo de Inventario</h1>
            <p className="text-slate-400 text-sm">
              Sube tu Excel y obtén análisis automático de competencia para todos tus productos
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto space-y-6">

        {/* Zona de drag & drop */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-3xl p-12 transition-all cursor-pointer ${
            isDragging
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 transition-colors ${
              file ? 'bg-green-700' : isDragging ? 'bg-purple-600' : 'bg-slate-800'
            }`}>
              {file ? <CheckCircle2 className="w-10 h-10 text-green-300" /> : <Upload className="w-10 h-10" />}
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {file ? file.name : 'Arrastra tu Excel de inventario aquí'}
            </h3>
            <p className="text-slate-400 mb-6">
              {file
                ? `${(file.size / 1024).toFixed(1)} KB — listo para analizar`
                : 'Soporta columnas MARCA, MEDIDA, PRECIO / NETO (y más)'}
            </p>
            {!file && (
              <span className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-medium transition-colors">
                Seleccionar Archivo Excel
              </span>
            )}
          </div>
        </div>

        {/* Botón Procesar */}
        {file && phase === 'idle' && (
          <button
            onClick={handleUpload}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-3 shadow-lg shadow-purple-900/20"
          >
            <FileSpreadsheet className="w-6 h-6" />
            🚀 Iniciar Análisis Masivo
          </button>
        )}

        {/* Spinner de upload */}
        {phase === 'uploading' && (
          <div className="flex items-center justify-center gap-3 py-8 text-slate-400">
            <Loader2 className="animate-spin w-6 h-6" />
            <span>Leyendo archivo Excel…</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-950/30 border border-red-900/50 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Info */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">¿Cómo funciona?</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-slate-400">
            <div>
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mb-2 text-white font-bold">1</div>
              <p className="font-medium text-white mb-1">Sube tu Excel</p>
              <p>Detecta automáticamente MARCA, MEDIDA, PRECIO (o NETO), COSTO y más</p>
            </div>
            <div>
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mb-2 text-white font-bold">2</div>
              <p className="font-medium text-white mb-1">Búsqueda en tiempo real</p>
              <p>Los resultados aparecen conforme se analizan — sin esperar a que termine todo</p>
            </div>
            <div>
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mb-2 text-white font-bold">3</div>
              <p className="font-medium text-white mb-1">Exporta el análisis</p>
              <p>Descarga el reporte completo en Excel con precios sugeridos y recomendaciones</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
