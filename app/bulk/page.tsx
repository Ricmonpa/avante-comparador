"use client";

import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import BulkResultsTable from '../../components/BulkResultsTable';
import ProgressBar from '../../components/ProgressBar';

interface AnalysisResult {
  sku: string;
  brand: string;
  model: string;
  size: string;
  yourPrice: number;
  bestCompetitorPrice: number;
  competitorVendor: string;
  difference: number;
  status: 'overpriced' | 'competitive' | 'underpriced' | 'error';
  recommendation: string;
  competitorUrl: string;
  error?: string;
}

interface UploadResult {
  success: boolean;
  total: number;
  analysis: AnalysisResult[];
  analysisSuccess: boolean;
  headerRowDetected: number;
  analysisError?: string;
}

export default function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile);
      setError('');
      setResult(null);
    } else {
      setError('Por favor sube un archivo Excel (.xlsx o .xls)');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Selecciona un archivo primero');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setProgress({ current: 0, total: 0 });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/bulk/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Error procesando el archivo');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error al procesar el archivo');
    } finally {
      setLoading(false);
    }
  };

  // Si tenemos resultados del análisis, mostrar la tabla
  if (result && result.analysis && result.analysis.length > 0) {
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
              <h1 className="text-2xl font-bold">Análisis Masivo Completado</h1>
              <p className="text-slate-400 text-sm">Headers detectados en fila {result.headerRowDetected}</p>
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto">
          <BulkResultsTable 
            results={result.analysis} 
            totalProcessed={result.total}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      
      {/* Header */}
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
            <p className="text-slate-400 text-sm">Sube tu Excel y obtén análisis automático de competencia para todos tus productos</p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Drag & Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-3xl p-12 transition-all ${
            isDragging 
              ? 'border-purple-500 bg-purple-500/10' 
              : 'border-slate-700 bg-slate-900/50'
          }`}
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
              isDragging ? 'bg-purple-600' : 'bg-slate-800'
            }`}>
              <Upload className="w-10 h-10" />
            </div>
            
            <h3 className="text-xl font-semibold mb-2">
              {file ? file.name : 'Arrastra tu Excel de inventario aquí'}
            </h3>
            
            <p className="text-slate-400 mb-6">
              {file 
                ? `Tamaño: ${(file.size / 1024).toFixed(2)} KB` 
                : 'El sistema detectará automáticamente los headers y analizará cada producto'
              }
            </p>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Seleccionar Archivo Excel
            </button>
          </div>
        </div>

        {/* Botón de Procesar */}
        {file && !result && (
          <button
            onClick={handleUpload}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-3 shadow-lg shadow-purple-900/20"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin w-6 h-6" />
                Analizando inventario completo...
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-6 h-6" />
                🚀 Iniciar Análisis Masivo
              </>
            )}
          </button>
        )}

        {/* Progress Bar */}
        {loading && progress.total > 0 && (
          <ProgressBar 
            current={progress.current} 
            total={progress.total}
            message="Comparando cada producto con Google Shopping..."
          />
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-950/30 border border-red-900/50 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Resultado básico (sin análisis) */}
        {result && (!result.analysis || result.analysis.length === 0) && (
          <div className="space-y-6 animate-in slide-in-from-bottom-8 fade-in duration-700">
            
            {/* Error en análisis */}
            <div className="bg-yellow-950/20 border border-yellow-900/50 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-yellow-500" />
                <h3 className="text-xl font-semibold text-yellow-400">Archivo Procesado - Error en Análisis</h3>
              </div>
              <p className="text-yellow-300 mb-4">
                El archivo se procesó correctamente pero hubo un error en el análisis automático de competencia.
              </p>
              <div className="text-sm text-slate-400">
                <p>Headers detectados en fila: {result.headerRowDetected}</p>
                <p>Total de productos: {result.total}</p>
                {result.analysisError && <p>Error: {result.analysisError}</p>}
              </div>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-medium transition-colors"
            >
              Intentar de Nuevo
            </button>
          </div>
        )}

        {/* Información sobre el proceso */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">¿Cómo funciona el análisis masivo?</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-slate-400">
            <div>
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mb-2">1</div>
              <p className="font-medium text-white mb-1">Detección automática</p>
              <p>El sistema detecta automáticamente dónde están los headers en tu Excel (SKU, Marca, Modelo, etc.)</p>
            </div>
            <div>
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mb-2">2</div>
              <p className="font-medium text-white mb-1">Búsqueda masiva</p>
              <p>Por cada producto, busca automáticamente en Google Shopping para encontrar el mejor precio de competencia</p>
            </div>
            <div>
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mb-2">3</div>
              <p className="font-medium text-white mb-1">Análisis inteligente</p>
              <p>Compara tus precios vs competencia y te dice qué productos están más caros, competitivos o más baratos</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}