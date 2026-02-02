"use client";

import { useState } from 'react';
import { ExternalLink, TrendingDown, TrendingUp, Minus, AlertTriangle } from 'lucide-react';

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

interface BulkResultsTableProps {
  results: AnalysisResult[];
  totalProcessed: number;
}

export default function BulkResultsTable({ results, totalProcessed }: BulkResultsTableProps) {
  const [filter, setFilter] = useState<'all' | 'overpriced' | 'competitive' | 'underpriced'>('all');

  const filteredResults = results.filter(result => {
    if (filter === 'all') return true;
    return result.status === filter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'overpriced': return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'underpriced': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'competitive': return <Minus className="w-4 h-4 text-yellow-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-gray-500" />;
      default: return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'overpriced': return '🔴 Más caro';
      case 'underpriced': return '🟢 Más barato';
      case 'competitive': return '✅ Competitivo';
      case 'error': return '⚠️ Error';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overpriced': return 'bg-red-950/30 border-red-900/50 text-red-400';
      case 'underpriced': return 'bg-green-950/30 border-green-900/50 text-green-400';
      case 'competitive': return 'bg-yellow-950/30 border-yellow-900/50 text-yellow-400';
      case 'error': return 'bg-gray-950/30 border-gray-900/50 text-gray-400';
      default: return 'bg-slate-950/30 border-slate-900/50 text-slate-400';
    }
  };

  const exportToExcel = () => {
    // Implementar exportación a Excel
    console.log('Exportando a Excel...', results);
  };

  const overpriced = results.filter(r => r.status === 'overpriced').length;
  const competitive = results.filter(r => r.status === 'competitive').length;
  const underpriced = results.filter(r => r.status === 'underpriced').length;
  const errors = results.filter(r => r.status === 'error').length;

  return (
    <div className="space-y-6">
      
      {/* Header con estadísticas */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-4">📊 Análisis de Competencia</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <p className="text-slate-400">Total productos</p>
            <p className="text-2xl font-bold text-white">{totalProcessed}</p>
          </div>
          <div>
            <p className="text-slate-400">Más caros</p>
            <p className="text-2xl font-bold text-red-400">{overpriced}</p>
          </div>
          <div>
            <p className="text-slate-400">Competitivos</p>
            <p className="text-2xl font-bold text-yellow-400">{competitive}</p>
          </div>
          <div>
            <p className="text-slate-400">Más baratos</p>
            <p className="text-2xl font-bold text-green-400">{underpriced}</p>
          </div>
          <div>
            <p className="text-slate-400">Errores</p>
            <p className="text-2xl font-bold text-gray-400">{errors}</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Todos ({results.length})
        </button>
        <button
          onClick={() => setFilter('overpriced')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'overpriced' 
              ? 'bg-red-600 text-white' 
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          🔴 Más caros ({overpriced})
        </button>
        <button
          onClick={() => setFilter('competitive')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'competitive' 
              ? 'bg-yellow-600 text-white' 
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          ✅ Competitivos ({competitive})
        </button>
        <button
          onClick={() => setFilter('underpriced')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'underpriced' 
              ? 'bg-green-600 text-white' 
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          🟢 Más baratos ({underpriced})
        </button>
      </div>

      {/* Tabla de resultados */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800">
              <tr>
                <th className="text-left py-4 px-4 font-semibold text-slate-300">SKU</th>
                <th className="text-left py-4 px-4 font-semibold text-slate-300">Producto</th>
                <th className="text-left py-4 px-4 font-semibold text-slate-300">Tu Precio</th>
                <th className="text-left py-4 px-4 font-semibold text-slate-300">Mejor Competencia</th>
                <th className="text-left py-4 px-4 font-semibold text-slate-300">Diferencia</th>
                <th className="text-left py-4 px-4 font-semibold text-slate-300">Estado</th>
                <th className="text-left py-4 px-4 font-semibold text-slate-300">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((result, index) => (
                <tr key={index} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                  <td className="py-4 px-4 font-mono text-xs">{result.sku}</td>
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-medium">{result.brand} {result.model}</p>
                      <p className="text-slate-400 text-xs">{result.size}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-semibold">
                    ${result.yourPrice?.toLocaleString() || 'N/A'}
                  </td>
                  <td className="py-4 px-4">
                    {result.status !== 'error' ? (
                      <div>
                        <p className="font-medium">${result.bestCompetitorPrice?.toLocaleString()}</p>
                        <p className="text-slate-400 text-xs">{result.competitorVendor}</p>
                      </div>
                    ) : (
                      <p className="text-gray-400 text-xs">{result.error}</p>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    {result.status !== 'error' && (
                      <span className={`font-semibold ${
                        result.difference > 0 ? 'text-red-400' : result.difference < 0 ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                        {result.difference > 0 ? '-' : '+'}${Math.abs(result.difference).toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-medium ${getStatusColor(result.status)}`}>
                      {getStatusIcon(result.status)}
                      {getStatusText(result.status)}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {result.status !== 'error' && (
                      <a
                        href={result.competitorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors text-xs"
                      >
                        Ver en Google
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-4">
        <button
          onClick={exportToExcel}
          className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-medium transition-colors"
        >
          📊 Exportar resultados a Excel
        </button>
        <button
          onClick={() => window.location.reload()}
          className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
        >
          🔄 Cargar otro archivo
        </button>
      </div>
    </div>
  );
}