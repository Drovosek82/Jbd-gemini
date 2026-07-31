import React, { useState, useEffect, useMemo, useRef } from 'react';
import { bleManager } from '../lib/bleManager';
import { TelemetryHistoryPoint } from '../types/bms';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Play,
  Pause,
  Download,
  Upload,
  Trash2,
  Activity,
  Battery,
  Zap,
  Thermometer,
  Layers,
  Calendar,
  BarChart3,
  Clock,
} from 'lucide-react';

type TimeRangeFilter = '5m' | '1h' | '24h' | '7d' | 'all';

export const LiveCharts: React.FC = () => {
  const [isPaused, setIsPaused] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('1h');
  const [activeTab, setActiveTab] = useState<'all' | 'soc' | 'vi' | 'temp' | 'cells'>('all');
  const [, setTick] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isPaused) return;
    return bleManager.subscribe(() => setTick((t) => t + 1));
  }, [isPaused]);

  const rawHistory = bleManager.history;
  const thresholds = bleManager.thresholds;

  // Filter history based on selected time window
  const filteredHistory = useMemo(() => {
    if (rawHistory.length === 0) return [];
    if (timeRange === 'all') return rawHistory;

    const now = Date.now();
    let durationMs = 5 * 60 * 1000; // 5 min default

    if (timeRange === '1h') durationMs = 60 * 60 * 1000;
    else if (timeRange === '24h') durationMs = 24 * 60 * 60 * 1000;
    else if (timeRange === '7d') durationMs = 7 * 24 * 60 * 60 * 1000;

    const cutoff = now - durationMs;
    const res = rawHistory.filter((p) => p.timestamp >= cutoff);
    return res.length > 0 ? res : rawHistory.slice(-20); // Fallback to last 20 if range is small
  }, [rawHistory, timeRange]);

  // Compute Statistical Summary metrics for filtered range
  const stats = useMemo(() => {
    if (filteredHistory.length === 0) {
      return {
        avgVoltage: 0,
        minVoltage: 0,
        maxVoltage: 0,
        maxDischargeCurrent: 0,
        maxChargeCurrent: 0,
        minSoc: 0,
        maxSoc: 0,
        avgSoc: 0,
        maxTemp: 0,
        maxDelta: 0,
      };
    }

    const voltages = filteredHistory.map((h) => h.voltage);
    const currents = filteredHistory.map((h) => h.current);
    const socs = filteredHistory.map((h) => h.soc);
    const temps = filteredHistory.flatMap((h) => [h.temp1, h.temp2].filter(Boolean));
    const deltas = filteredHistory.map((h) => h.delta);

    const sumV = voltages.reduce((a, b) => a + b, 0);
    const sumSoc = socs.reduce((a, b) => a + b, 0);

    const dischargeCurrents = currents.filter((c) => c < 0).map((c) => Math.abs(c));
    const chargeCurrents = currents.filter((c) => c > 0);

    return {
      avgVoltage: Math.round((sumV / voltages.length) * 100) / 100,
      minVoltage: Math.min(...voltages),
      maxVoltage: Math.max(...voltages),
      maxDischargeCurrent: dischargeCurrents.length > 0 ? Math.max(...dischargeCurrents) : 0,
      maxChargeCurrent: chargeCurrents.length > 0 ? Math.max(...chargeCurrents) : 0,
      minSoc: Math.min(...socs),
      maxSoc: Math.max(...socs),
      avgSoc: Math.round(sumSoc / socs.length),
      maxTemp: temps.length > 0 ? Math.max(...temps) : 0,
      maxDelta: deltas.length > 0 ? Math.max(...deltas) : 0,
    };
  }, [filteredHistory]);

  const handleExportCSV = () => {
    if (rawHistory.length === 0) return;
    const headers =
      'Timestamp,DateStr,Time,Voltage_V,Current_A,Power_W,SOC_%,Temp1_C,Temp2_C,MinCell_V,MaxCell_V,Delta_mV\n';
    const rows = rawHistory
      .map(
        (p) =>
          `${p.timestamp},"${p.dateStr}","${p.time}",${p.voltage},${p.current},${p.power},${p.soc},${p.temp1},${p.temp2},${p.minCell},${p.maxCell},${p.delta}`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `jbd_bms_telemetry_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const imported: TelemetryHistoryPoint[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const parts = line.split(',');
          if (parts.length >= 8) {
            const timestamp = Number(parts[0]) || Date.now();
            const dateStr = parts[1]?.replace(/"/g, '') || new Date().toLocaleString();
            const timeStr = parts[2]?.replace(/"/g, '') || parts[0];
            const voltage = Number(parts[3]) || 0;
            const current = Number(parts[4]) || 0;
            const power = Number(parts[5]) || 0;
            const soc = Number(parts[6]) || 0;
            const temp1 = Number(parts[7]) || 0;
            const temp2 = Number(parts[8]) || 0;
            const minCell = Number(parts[9]) || 0;
            const maxCell = Number(parts[10]) || 0;
            const delta = Number(parts[11]) || 0;

            imported.push({
              timestamp,
              dateStr,
              time: timeStr,
              voltage,
              current,
              power,
              soc,
              temp1,
              temp2,
              minCell,
              maxCell,
              delta,
            });
          }
        }

        if (imported.length > 0) {
          bleManager.history = imported;
          localStorage.setItem('jbd_bms_history', JSON.stringify(imported));
          setTick((t) => t + 1);
          alert(`Успішно імпортовано ${imported.length} точок історичних даних!`);
        }
      } catch (err) {
        alert('Помилка при читанні CSV файлу.');
      }
    };
    reader.readAsText(file);
  };

  const handleClearHistory = () => {
    if (confirm('Очистити всю збережену історію телеметрії?')) {
      bleManager.history = [];
      localStorage.removeItem('jbd_bms_history');
      setTick((t) => t + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <span>Візуалізація Телеметрії та Історичні Графіки</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Моніторинг в реальному часі та аналіз динаміки SOC %, напруги, струму й температур за обраний період
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time Filter Buttons */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[
              { id: '5m', label: '5 хв (Live)' },
              { id: '1h', label: '1 год' },
              { id: '24h', label: '24 год' },
              { id: '7d', label: '7 днів' },
              { id: 'all', label: 'Всі' },
            ].map((range) => (
              <button
                key={range.id}
                onClick={() => setTimeRange(range.id as TimeRangeFilter)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  timeRange === range.id
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              isPaused
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Відновити' : 'Пауза'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={rawHistory.length === 0}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Експорт</span>
          </button>

          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleImportCSV}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center space-x-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Імпорт</span>
          </button>

          <button
            onClick={handleClearHistory}
            disabled={rawHistory.length === 0}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-rose-900/40 text-rose-400 border border-slate-700 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Statistical Overview Bar for Selected Period */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {/* SOC Min/Max */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <Battery className="w-3.5 h-3.5 text-emerald-400" />
            <span>Заряд (SOC)</span>
          </span>
          <div className="my-1">
            <span className="text-xl font-bold font-mono text-white">{stats.avgSoc}%</span>
          </div>
          <div className="text-[10px] text-slate-400 flex justify-between font-mono">
            <span>Мін: {stats.minSoc}%</span>
            <span>Макс: {stats.maxSoc}%</span>
          </div>
        </div>

        {/* Avg Voltage */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Сер. Напруга</span>
          </span>
          <div className="my-1">
            <span className="text-xl font-bold font-mono text-white">{stats.avgVoltage} V</span>
          </div>
          <div className="text-[10px] text-slate-400 flex justify-between font-mono">
            <span>Мін: {stats.minVoltage}V</span>
            <span>Макс: {stats.maxVoltage}V</span>
          </div>
        </div>

        {/* Peak Discharge Current */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>Пік Розряду</span>
          </span>
          <div className="my-1">
            <span className="text-xl font-bold font-mono text-amber-400">-{stats.maxDischargeCurrent.toFixed(1)} A</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">Максимальний відтік</div>
        </div>

        {/* Peak Charge Current */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Пік Заряду</span>
          </span>
          <div className="my-1">
            <span className="text-xl font-bold font-mono text-emerald-400">+{stats.maxChargeCurrent.toFixed(1)} A</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">Максимальний приплив</div>
        </div>

        {/* Max Temperature */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <Thermometer className="w-3.5 h-3.5 text-rose-400" />
            <span>Макс. Температура</span>
          </span>
          <div className="my-1">
            <span className="text-xl font-bold font-mono text-white">{stats.maxTemp.toFixed(1)} °C</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Поріг: {thresholds.tempHigh}°C
          </div>
        </div>

        {/* Max Cell Delta */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Макс. Розбаланс</span>
          </span>
          <div className="my-1">
            <span className="text-xl font-bold font-mono text-purple-300">{stats.maxDelta} mV</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">ΔV між осередками</div>
        </div>
      </div>

      {/* Chart Category Switcher */}
      <div className="flex border-b border-slate-800 space-x-2 pb-2">
        {[
          { id: 'all', label: 'Усі Графіки' },
          { id: 'soc', label: 'Рівень Заряду (SOC %)' },
          { id: 'vi', label: 'Напруга (V) & Струм (A)' },
          { id: 'temp', label: 'Температури (°C)' },
          { id: 'cells', label: 'Осередки Min/Max & ΔV' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* GRAPH 1: SOC % (Area Chart with Threshold Reference Lines) */}
      {(activeTab === 'all' || activeTab === 'soc') && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Battery className="w-4 h-4 text-emerald-400" />
              <span>Динаміка Рівня Заряду (SOC %)</span>
            </h4>
            <span className="text-xs text-slate-400 font-mono">
              Точок у вибірці: {filteredHistory.length}
            </span>
          </div>

          <div className="h-64 w-full">
            {filteredHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredHistory}>
                  <defs>
                    <linearGradient id="socGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickMargin={6} />
                  <YAxis stroke="#10b981" fontSize={11} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff' }}
                  />
                  <ReferenceLine y={thresholds.socLow} label={{ value: `Поріг Низький ${thresholds.socLow}%`, fill: '#f59e0b', fontSize: 10 }} stroke="#f59e0b" strokeDasharray="3 3" />
                  <ReferenceLine y={thresholds.socCriticalLow} label={{ value: `Критичний ${thresholds.socCriticalLow}%`, fill: '#f43f5e', fontSize: 10 }} stroke="#f43f5e" strokeDasharray="3 3" />
                  <Area
                    type="monotone"
                    dataKey="soc"
                    name="Заряд SOC (%)"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#socGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Очікування даних історії...
              </div>
            )}
          </div>
        </div>
      )}

      {/* GRAPH 2: Pack Voltage & Current (Dual Y-Axis) */}
      {(activeTab === 'all' || activeTab === 'vi') && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Загальна Напруга (V) та Струм (A)</span>
            </h4>
          </div>

          <div className="h-72 w-full">
            {filteredHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickMargin={6} />
                  <YAxis yAxisId="left" stroke="#38bdf8" fontSize={11} domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                  <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="voltage"
                    name="Напруга (V)"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="current"
                    name="Струм (A)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Немає даних телеметрії
              </div>
            )}
          </div>
        </div>
      )}

      {/* GRAPH 3: Temperature Sensors (NTC1 & NTC2 °C) */}
      {(activeTab === 'all' || activeTab === 'temp') && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-amber-400" />
              <span>Температури Датчиків NTC1 та NTC2 (°C)</span>
            </h4>
          </div>

          <div className="h-64 w-full">
            {filteredHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#f59e0b" fontSize={11} domain={['dataMin - 2', 'dataMax + 5']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <ReferenceLine y={thresholds.tempHigh} label={{ value: `Поріг перегріву ${thresholds.tempHigh}°C`, fill: '#ef4444', fontSize: 10 }} stroke="#ef4444" strokeDasharray="4 4" />
                  <Line
                    type="monotone"
                    dataKey="temp1"
                    name="NTC1 Осередки (°C)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="temp2"
                    name="NTC2 Батарея (°C)"
                    stroke="#ec4899"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Немає температурних даних
              </div>
            )}
          </div>
        </div>
      )}

      {/* GRAPH 4: Min/Max Cell Voltages & Delta mV */}
      {(activeTab === 'all' || activeTab === 'cells') && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Осередки: Min/Max V та ΔV (мВ)</span>
            </h4>
          </div>

          <div className="h-64 w-full">
            {filteredHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                  <YAxis yAxisId="left" stroke="#a855f7" domain={['dataMin - 0.05', 'dataMax + 0.05']} fontSize={11} />
                  <YAxis yAxisId="right" orientation="right" stroke="#ec4899" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="maxCell"
                    name="Max Cell (V)"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="minCell"
                    name="Min Cell (V)"
                    stroke="#eab308"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="delta"
                    name="Delta ΔV (mV)"
                    stroke="#ec4899"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Немає даних осередків
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
