import React, { useState, useEffect } from 'react';
import { bleManager } from '../lib/bleManager';
import { Layers, Zap, Scale, Award, Info } from 'lucide-react';

export const CellVoltages: React.FC = () => {
  const [, setTick] = useState(0);

  useEffect(() => {
    return bleManager.subscribe(() => setTick((t) => t + 1));
  }, []);

  const bms = bleManager.bmsData;
  const params = bleManager.parameters;

  // Compute cell min/max range based on chemistry
  const minThreshold = params.cellUnderVoltage || 2.5;
  const maxThreshold = params.cellOverVoltage || 3.65;
  const range = maxThreshold - minThreshold || 1.15;

  const balancingCells = bms.cells.filter((c) => c.isBalancing);

  return (
    <div className="space-y-6">
      {/* Summary Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Max Cell */}
        <div className="bg-slate-900/80 border border-purple-500/30 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-xs text-purple-400 font-medium">Максимальний Осередок (MAX)</div>
            <div className="text-2xl font-extrabold font-mono text-white mt-1">
              {bms.maxCellVoltage.toFixed(3)} <span className="text-sm font-normal text-slate-400">В</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Номер осередку: <span className="text-purple-300 font-semibold">№{bms.maxCellIndex}</span></div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* Min Cell */}
        <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-xs text-amber-400 font-medium">Мінімальний Осередок (MIN)</div>
            <div className="text-2xl font-extrabold font-mono text-white mt-1">
              {bms.minCellVoltage.toFixed(3)} <span className="text-sm font-normal text-slate-400">В</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Номер осередку: <span className="text-amber-300 font-semibold">№{bms.minCellIndex}</span></div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <Scale className="w-5 h-5" />
          </div>
        </div>

        {/* Delta Voltage */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Різниця Напруг (ΔV)</div>
            <div
              className={`text-2xl font-extrabold font-mono mt-1 ${
                bms.deltaVoltage <= 15
                  ? 'text-emerald-400'
                  : bms.deltaVoltage <= 40
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {bms.deltaVoltage} <span className="text-sm font-normal text-slate-400">мВ</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Пороги: <span className="text-slate-300 font-mono">&lt;15 мВ - Норма</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Balancing Status */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Стан Балансування</div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {balancingCells.length > 0 ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <Zap className="w-4 h-4 animate-bounce" /> {balancingCells.length} осередк(ів)
                </span>
              ) : (
                <span className="text-emerald-400">Пасивний</span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Поріг початку: <span className="text-slate-300 font-mono">{params.balanceStartVoltage}V</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid of Individual Cells */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 pb-4 border-b border-slate-800 gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <span>Напруги по осередках ({bms.cellCount}S)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Детальний розклад напруг шкірного осередку акумуляторного блоку
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Хімія: <strong className="text-cyan-300">{params.chemistry}</strong> (Мін: {minThreshold}V, Макс: {maxThreshold}V)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {bms.cells.map((cell) => {
            const isMax = cell.id === bms.maxCellIndex;
            const isMin = cell.id === bms.minCellIndex;

            // Calculate progress bar percentage
            const pct = Math.max(0, Math.min(100, ((cell.voltage - minThreshold) / range) * 100));

            return (
              <div
                key={cell.id}
                className={`bg-slate-950/70 border rounded-xl p-4 transition-all relative overflow-hidden ${
                  isMax
                    ? 'border-purple-500/60 ring-1 ring-purple-500/40 shadow-purple-900/20 shadow-lg'
                    : isMin
                    ? 'border-amber-500/60 ring-1 ring-amber-500/40 shadow-amber-900/20 shadow-lg'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-slate-300">Осередок #{cell.id}</span>
                    {isMax && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        MAX
                      </span>
                    )}
                    {isMin && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        MIN
                      </span>
                    )}
                  </div>

                  {cell.isBalancing && (
                    <span className="flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 animate-pulse">
                      <Zap className="w-3 h-3 mr-0.5" /> Баланс
                    </span>
                  )}
                </div>

                {/* Voltage Value */}
                <div className="my-2 flex items-baseline justify-between">
                  <span
                    className={`text-2xl font-extrabold font-mono tracking-tight ${
                      isMax ? 'text-purple-300' : isMin ? 'text-amber-300' : 'text-white'
                    }`}
                  >
                    {cell.voltage.toFixed(3)}
                  </span>
                  <span className="text-xs font-medium text-slate-400">В</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isMax
                        ? 'bg-purple-500'
                        : isMin
                        ? 'bg-amber-500'
                        : cell.voltage < params.cellUnderVoltage
                        ? 'bg-rose-500'
                        : cell.voltage > params.cellOverVoltage
                        ? 'bg-rose-500'
                        : 'bg-cyan-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>

                {/* Deviation from average */}
                <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
                  <span>Відхилення:</span>
                  <span className="font-mono text-slate-400">
                    {((cell.voltage - bms.totalVoltage / bms.cellCount) * 1000).toFixed(0)} мВ
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
