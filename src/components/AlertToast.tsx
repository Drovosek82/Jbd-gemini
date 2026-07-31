import React, { useEffect } from 'react';
import { bleManager } from '../lib/bleManager';
import { AlertTriangle, X, ShieldAlert, Info } from 'lucide-react';

export const AlertToast: React.FC = () => {
  const activeAlert = bleManager.activeToastAlert;

  useEffect(() => {
    if (!activeAlert) return;
    const timer = setTimeout(() => {
      bleManager.dismissToastAlert();
    }, 8000); // Auto dismiss after 8 sec
    return () => clearTimeout(timer);
  }, [activeAlert]);

  if (!activeAlert) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-bounce-in shadow-2xl">
      <div
        className={`p-4 rounded-2xl border flex items-start justify-between gap-3 backdrop-blur-lg ${
          activeAlert.severity === 'danger'
            ? 'bg-rose-950/90 border-rose-500 text-rose-100 shadow-rose-950/60 ring-2 ring-rose-500/50'
            : activeAlert.severity === 'warning'
            ? 'bg-amber-950/90 border-amber-500 text-amber-100 shadow-amber-950/60 ring-2 ring-amber-500/50'
            : 'bg-cyan-950/90 border-cyan-500 text-cyan-100 shadow-cyan-950/60'
        }`}
      >
        <div className="flex items-start space-x-3">
          <div className="mt-0.5 shrink-0">
            {activeAlert.severity === 'danger' ? (
              <ShieldAlert className="w-6 h-6 text-rose-400 animate-pulse" />
            ) : activeAlert.severity === 'warning' ? (
              <AlertTriangle className="w-6 h-6 text-amber-400 animate-pulse" />
            ) : (
              <Info className="w-6 h-6 text-cyan-400" />
            )}
          </div>

          <div>
            <h4 className="font-bold text-sm text-white">{activeAlert.title}</h4>
            <p className="text-xs mt-1 text-slate-200">{activeAlert.message}</p>
            <div className="flex items-center space-x-2 mt-2 text-[10px] font-mono text-slate-400">
              <span>Час: {activeAlert.timestamp}</span>
              <span>•</span>
              <span className="text-white font-bold">{activeAlert.currentValue}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => bleManager.dismissToastAlert()}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
