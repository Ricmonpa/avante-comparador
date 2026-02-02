"use client";

interface ProgressBarProps {
  current: number;
  total: number;
  message?: string;
}

export default function ProgressBar({ current, total, message }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">🔍 Analizando productos...</h3>
        <span className="text-sm text-slate-400">{current}/{total}</span>
      </div>
      
      <div className="w-full bg-slate-800 rounded-full h-3 mb-4">
        <div 
          className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-300">{message || 'Comparando precios con la competencia...'}</span>
        <span className="font-semibold text-white">{percentage}%</span>
      </div>
    </div>
  );
}