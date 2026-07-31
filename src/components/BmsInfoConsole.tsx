import React, { useState, useEffect } from 'react';
import { bleManager } from '../lib/bleManager';
import { Terminal, Copy, Trash2, Info, Cpu, Check, HelpCircle } from 'lucide-react';

export const BmsInfoConsole: React.FC = () => {
  const [, setTick] = useState(0);
  const [filterType, setFilterType] = useState<'all' | 'tx' | 'rx' | 'error'>('all');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return bleManager.subscribe(() => setTick((t) => t + 1));
  }, []);

  const bms = bleManager.bmsData;
  const logs = bleManager.logs;

  const filteredLogs = logs.filter((l) => (filterType === 'all' ? true : l.type === filterType));

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.command ? `(${l.command}) ` : ''}${l.description} | HEX: ${l.hex}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearLogs = () => {
    bleManager.logs = [];
    setTick((t) => t + 1);
  };

  return (
    <div className="space-y-6">
      {/* Top Specifications Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <span>Інформація про Пристрій JBD BMS</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <span className="text-xs text-slate-400 block">Модель Плати:</span>
            <span className="text-sm font-bold font-mono text-cyan-300">{bms.hardwareName || 'JBD Smart BMS'}</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <span className="text-xs text-slate-400 block">Версія Прошивки:</span>
            <span className="text-sm font-bold font-mono text-white">{bms.softwareVersion || 'v2.5'}</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <span className="text-xs text-slate-400 block">Дата Виготовлення:</span>
            <span className="text-sm font-bold font-mono text-white">{bms.productionDate || 'N/A'}</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <span className="text-xs text-slate-400 block">UUID Сервісу BLE:</span>
            <span className="text-xs font-bold font-mono text-slate-300 truncate block">0xFF00 / 0xFF01</span>
          </div>
        </div>
      </div>

      {/* BLE Console Logs Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <div>
              <h4 className="text-sm font-bold text-white">BLE Консоль Трафіку (HEX Logs)</h4>
              <p className="text-xs text-slate-400">Перегляд вихідних команд та вхідних пакетів даних</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Filters */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(['all', 'tx', 'rx', 'error'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium uppercase transition-colors ${
                    filterType === t ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <button
              onClick={handleCopyLogs}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Скопійовано' : 'Копіювати'}</span>
            </button>

            <button
              onClick={handleClearLogs}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-rose-900/40 text-rose-400 border border-slate-700 flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Log Viewer Window */}
        <div className="bg-slate-950 rounded-xl border border-slate-800/80 p-4 h-80 overflow-y-auto font-mono text-xs space-y-2">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <div key={log.id} className="flex flex-col sm:flex-row sm:items-baseline gap-1 py-1 border-b border-slate-900 text-slate-300">
                <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 uppercase ${
                    log.type === 'tx'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : log.type === 'rx'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : log.type === 'error'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {log.type}
                </span>

                <span className="text-slate-200 font-medium shrink-0">{log.description}</span>
                {log.hex && <span className="text-cyan-400 text-[11px] truncate">HEX: {log.hex}</span>}
              </div>
            ))
          ) : (
            <div className="h-full flex items-center justify-center text-slate-600">
              Логи порожні. Натисніть кнопки опитування або відправки команд.
            </div>
          )}
        </div>
      </div>

      {/* Guide & Technical Specifications */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3 text-xs text-slate-300">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <span>Довідка по протоколу JBD BMS (Jiabaida / Xiaoxiang / Overkill)</span>
        </h4>
        <ul className="list-disc list-inside space-y-1 text-slate-400">
          <li>
            <strong>Структура запиту JBD:</strong> <code className="text-cyan-300">0xDD 0xA5 [CMD] 0x00 [CS_HI] [CS_LO] 0x77</code>
          </li>
          <li>
            <strong>Команда 0x03:</strong> Зчитування загальної напруги, струму, ємності, циклів, стану ключів MOS та прапорів захисту.
          </li>
          <li>
            <strong>Команда 0x04:</strong> Зчитування напруг окремих осередків (Cell 1 .. Cell N) в мілівольтах.
          </li>
          <li>
            <strong>Команда 0xE0:</strong> Керування вихідними MOSFET ключами заряду (Bit 0) та розряду (Bit 1).
          </li>
          <li>
            <strong>Сумісність:</strong> Працює з BMS Jiabaida, Xiaoxiang Smart BMS, Overkill Solar, Liontron, Daly JBD OEM.
          </li>
        </ul>
      </div>
    </div>
  );
};
