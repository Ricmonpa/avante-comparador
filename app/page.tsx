"use client";

import { useState } from 'react';
import {
  Search, Loader2, AlertCircle, CheckCircle, TrendingDown, TrendingUp,
  DollarSign, Activity, Globe, ShieldAlert, FileSpreadsheet, History, X
} from 'lucide-react';
import Link from 'next/link';
import type { CompetitorInfo, PriceHistoryEntry } from '../types';

interface ScrapeResult {
  success: boolean;
  specsDetected?: string;
  data?: {
    avante: {
      found: boolean;
      price: number;
      url: string;
      source: string;
      sku?: string;
      stock?: number;
    };
    competitor: CompetitorInfo;
    competitors: CompetitorInfo[];
    currency: string;
  };
  error?: string;
}

export default function Home() {
  const [query, setQuery] = useState('Michelin Primacy 4 205/55 R16');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError('');
    setShowHistory(false);

    try {
      const res = await fetch(`/api/scrape?q=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (!data.success && !data.data) throw new Error(data.error || 'Error en la búsqueda');

      setTimeout(() => {
        setResult(data);
        setLoading(false);
      }, 1000);
    } catch {
      setError('Error conectando con el motor de inteligencia.');
      setLoading(false);
    }
  };

  const handleShowHistory = async () => {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/price-history?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setHistory(data.history || []);
      setShowHistory(true);
    } catch {
      setHistory([]);
      setShowHistory(true);
    } finally {
      setHistoryLoading(false);
    }
  };

  const competitors: CompetitorInfo[] = result?.data?.competitors || (
    result?.data?.competitor ? [result.data.competitor] : []
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans selection:bg-blue-500/30">

      {/* HEADER */}
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-12 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-900/20">A</div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Avante Intelligence</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              LIVE MARKET DATA
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/bulk"
            className="hidden md:flex items-center gap-2 text-sm bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg transition-colors font-medium"
          >
            <FileSpreadsheet size={16} />
            Carga Masiva
          </a>
          <div className="hidden md:flex items-center gap-4 text-xs text-slate-500 font-mono bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2">
              <Globe size={14} />
              <span>SOURCES: GLOBAL</span>
            </div>
            <span className="text-slate-700">|</span>
            <span>BOTS: ACTIVE</span>
          </div>
        </div>
      </header>

      {/* INPUT AREA */}
      <section className="max-w-2xl mx-auto mb-16 relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Comparador de Mercado Real
          </h2>
          <p className="text-slate-400">Busca en tu web y en la competencia simultáneamente.</p>
        </div>

        <div className="mb-8">
          <Link
            href="/bulk"
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white py-4 px-6 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-3 shadow-lg shadow-purple-900/20 group"
          >
            <FileSpreadsheet className="w-6 h-6 group-hover:scale-110 transition-transform" />
            Analizar Inventario Completo
          </Link>
          <p className="text-center text-slate-500 text-sm mt-2">
            ¿Tienes muchos SKUs? Sube tu Excel y obtén análisis automático de todos tus productos
          </p>
        </div>

        <div className="relative">
          <div className="text-center mb-4">
            <span className="text-slate-500 text-sm">o busca un producto individual</span>
          </div>
        </div>

        <form onSubmit={handleSearch} className="relative group">
          <div className="absolute inset-0 bg-blue-600/20 blur-xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="relative w-full bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-2xl py-5 pl-14 pr-32 text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none shadow-2xl transition-all placeholder:text-slate-600"
            placeholder="Ej: Michelin Defender T+H 205/60R16"
          />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 w-6 h-6" />
          <button
            disabled={loading}
            type="submit"
            className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-900/20"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Escanear'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-red-400 text-sm text-center flex items-center justify-center gap-2">
            <ShieldAlert size={16} />
            {error}
          </div>
        )}
      </section>

      {/* LOADING */}
      {loading && (
        <div className="max-w-xl mx-auto text-center py-12 animate-in fade-in duration-500">
          <div className="inline-block relative mb-6">
            <div className="w-20 h-20 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="w-8 h-8 text-blue-500 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2 font-mono text-sm text-slate-500">
            <p className="animate-pulse">Analizando grupoavante.org...</p>
            <p className="animate-pulse delay-75">Escaneando Google Shopping...</p>
            <p className="animate-pulse delay-150 text-blue-400">Comparando especificaciones...</p>
          </div>
        </div>
      )}

      {/* RESULTADOS */}
      {result && !loading && result.success && result.data && (
        <div className="max-w-6xl mx-auto animate-in slide-in-from-bottom-8 fade-in duration-700">

          {/* Botón historial */}
          <div className="flex justify-end mb-4">
            <button
              onClick={handleShowHistory}
              disabled={historyLoading}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-600 px-4 py-2 rounded-lg transition-all"
            >
              {historyLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <History className="w-4 h-4" />}
              {showHistory ? 'Ocultar historial' : 'Ver historial de precios'}
            </button>
          </div>

          {/* Panel de historial */}
          {showHistory && (
            <div className="mb-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Historial de precios — {query}
                </h3>
                <button onClick={() => setShowHistory(false)} className="text-slate-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {history.length === 0 ? (
                <p className="text-slate-500 text-sm">No hay historial aún. Los precios se guardarán a partir de esta búsqueda.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800">
                        <th className="text-left py-2 pr-4 font-medium">Fecha</th>
                        <th className="text-left py-2 pr-4 font-medium">Precio Avante</th>
                        <th className="text-left py-2 pr-4 font-medium">Mejor Competencia</th>
                        <th className="text-left py-2 font-medium">Vendedor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(0, 10).map((entry, i) => (
                        <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                          <td className="py-2 pr-4 text-slate-400 font-mono text-xs">
                            {new Date(entry.date).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="py-2 pr-4 font-semibold text-white">
                            ${entry.avantePrice?.toLocaleString()}
                          </td>
                          <td className={`py-2 pr-4 font-semibold ${
                            entry.competitorPrice < entry.avantePrice ? 'text-red-400' : 'text-green-400'
                          }`}>
                            ${entry.competitorPrice?.toLocaleString()}
                          </td>
                          <td className="py-2 text-slate-400 text-xs">{entry.competitorVendor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Grid: Avante + hasta 3 competidores */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* CARD AVANTE */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
                    <DollarSign className="w-6 h-6 text-slate-200" />
                  </div>
                  <span className="font-mono text-slate-400 text-sm uppercase tracking-wider">Tu Precio</span>
                </div>

                {result.data.avante.found ? (
                  <>
                    <div className="text-5xl font-bold text-white mb-2 tracking-tight">
                      ${result.data.avante.price.toLocaleString()}
                    </div>
                    <p className="text-green-400 text-sm flex items-center gap-1">
                      <CheckCircle size={14} /> Detectado en grupoavante.org
                    </p>
                    {result.specsDetected && (
                      <p className="text-slate-500 text-xs mt-1">{result.specsDetected}</p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-slate-600 mb-2 tracking-tight">No Detectado</div>
                    <div className="bg-yellow-900/20 border border-yellow-800/50 p-3 rounded-xl mt-2">
                      <p className="text-yellow-500 text-xs flex items-center gap-2">
                        <AlertCircle size={14} />
                        Google Shopping no muestra este producto en tu sitio.
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800/50">
                <a href={result.data.avante.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                  Ver resultado de búsqueda <Globe size={12} />
                </a>
              </div>
            </div>

            {/* CARDS COMPETIDORES (hasta 3) */}
            {competitors.slice(0, 3).map((comp, idx) => {
              const isMoreExpensive = result.data!.avante.found && comp.price < result.data!.avante.price;
              const colorClass = !result.data!.avante.found
                ? 'bg-slate-900 border-slate-700'
                : isMoreExpensive
                ? 'bg-red-950/20 border-red-900/50'
                : 'bg-green-950/20 border-green-900/50';

              const rankLabel = idx === 0 ? '1er lugar' : idx === 1 ? '2° lugar' : '3er lugar';

              const cardContent = (
                <>
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg border ${
                          !result.data!.avante.found ? 'bg-slate-800 border-slate-700 text-slate-400' :
                          isMoreExpensive ? 'bg-red-900/30 border-red-900/50 text-red-400' : 'bg-green-900/30 border-green-900/50 text-green-400'
                        }`}>
                          {!result.data!.avante.found ? <Search size={20} /> :
                           isMoreExpensive ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                        </div>
                        <div>
                          <h3 className="text-slate-200 font-medium text-sm">Competidor</h3>
                          <div className="text-xs text-slate-500 uppercase tracking-wide">{comp.vendor}</div>
                        </div>
                      </div>
                      <span className="text-xs text-slate-600 font-mono">{rankLabel}</span>
                    </div>

                    <div className="text-4xl font-bold text-white mb-4 tracking-tight">
                      ${comp.price.toLocaleString()}
                    </div>

                    {result.data!.avante.found && (
                      <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/50">
                        <div className="flex items-start gap-2">
                          {isMoreExpensive ? (
                            <>
                              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-red-200 font-medium text-xs">Más baratos por</p>
                                <p className="text-white font-bold text-sm">
                                  ${(result.data!.avante.price - comp.price).toLocaleString()}
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-green-200 font-medium text-xs">Ventaja Avante</p>
                                <p className="text-white font-bold text-sm">
                                  ${(comp.price - result.data!.avante.price).toLocaleString()}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 text-[10px] text-slate-600 font-mono border-t border-slate-800/50 pt-3 truncate flex items-center justify-between gap-2">
                    <span className="truncate">{comp.title}</span>
                    {comp.link && (
                      <span className="text-blue-400 shrink-0 flex items-center gap-1">
                        Ver <Globe size={10} />
                      </span>
                    )}
                  </div>
                </>
              );

              return comp.link ? (
                <a
                  key={idx}
                  href={comp.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${colorClass} rounded-3xl p-8 border relative overflow-hidden flex flex-col justify-between transition-colors duration-300 cursor-pointer hover:ring-2 hover:ring-blue-500/50 hover:border-blue-500/30`}
                >
                  {cardContent}
                </a>
              ) : (
                <div
                  key={idx}
                  className={`${colorClass} rounded-3xl p-8 border relative overflow-hidden flex flex-col justify-between`}
                >
                  {cardContent}
                </div>
              );
            })}

            {/* Placeholder si hay menos de 3 competidores */}
            {competitors.length === 0 && !loading && (
              <div className="md:col-span-3 bg-slate-900/30 border border-slate-800/50 rounded-3xl p-8 flex items-center justify-center text-slate-600 text-sm">
                No se encontraron competidores en Google Shopping
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
