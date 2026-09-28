import React, { useState, useEffect } from 'react';
import { supabaseService, SupabaseBmsRecord } from '../lib/supabaseService';
import { bleManager } from '../lib/bleManager';
import {
  Layers,
  Zap,
  Battery,
  Activity,
  Thermometer,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  RefreshCw,
  Server,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Cpu,
  Cloud,
} from 'lucide-react';

interface FleetDashboardProps {
  onSelectBms: (deviceName: string) => void;
}

export const FleetDashboard: React.FC<FleetDashboardProps> = ({ onSelectBms }) => {
  const [, setTick] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const unsub = supabaseService.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  const devices = supabaseService.devicesList;
  const isEnabled = supabaseService.config.enabled;

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await supabaseService.fetchAllDevicesTelemetry();
    setIsRefreshing(false);
  };

  // Aggregated Stats Calculation
  const totalCount = devices.length;
  const onlineDevices = devices.filter((d) => d.isOnline);
  const onlineCount = onlineDevices.length;

  const totalPowerW = devices.reduce((sum, d) => sum + (d.power || 0), 0);
  const totalPowerKw = (totalPowerW / 1000).toFixed(2);

  const totalCurrentA = devices.reduce((sum, d) => sum + (d.current || 0), 0);
  const isFleetCharging = totalCurrentA > 0.5;
  const isFleetDischarging = totalCurrentA < -0.5;

  const avgSoc = totalCount > 0 ? Math.round(devices.reduce((sum, d) => sum + (d.soc || 0), 0) / totalCount) : 0;

  const totalRemainingAh = devices.reduce((sum, d) => sum + (d.remaining_capacity || 0), 0);
  const totalNominalAh = devices.reduce((sum, d) => sum + (d.nominal_capacity || 0), 0);

  // Global Cell Min / Max across all BMS packs
  let globalMinCell = { voltage: 99, device: '—', cellIndex: 0 };
  let globalMaxCell = { voltage: 0, device: '—', cellIndex: 0 };

  devices.forEach((dev) => {
    if (dev.cell_voltages && dev.cell_voltages.length > 0) {
      dev.cell_voltages.forEach((v, idx) => {
        if (v > 0 && v < globalMinCell.voltage) {
          globalMinCell = { voltage: v, device: dev.device_name, cellIndex: idx + 1 };
        }
        if (v > globalMaxCell.voltage) {
          globalMaxCell = { voltage: v, device: dev.device_name, cellIndex: idx + 1 };
        }
      });
    }
  });

  const globalDeltaMv =
    globalMaxCell.voltage > 0 && globalMinCell.voltage < 99
      ? Math.round((globalMaxCell.voltage - globalMinCell.voltage) * 1000)
      : 0;

  const filteredDevices = devices.filter((dev) =>
    dev.device_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Control */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white tracking-tight">Мульти-BMS Флотилія (Supabase Cloud)</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-mono font-bold border border-cyan-500/30">
                До 20 BMS
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Агрегований моніторинг багатьох акумуляторних блоків JBD SP14S004 в єдиній системі
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Пошук BMS за назвою..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-48"
            />
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Оновити</span>
          </button>
        </div>
      </div>

      {!isEnabled && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-amber-300 text-xs flex items-center space-x-3">
          <Cloud className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <strong className="font-bold">Supabase Cloud вимкнено.</strong> Перейдіть на вкладку "Сповіщення та Пороги" та увімкніть "Supabase Cloud Моніторинг", щоб отримувати телеметрію від ESP32.
          </div>
        </div>
      )}

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Fleet Power */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Сумарна Потужність</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-white font-mono">{totalPowerKw} <span className="text-sm font-normal text-slate-400">кВт</span></div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
              <span>З <strong>{totalCount}</strong> BMS блоків</span>
            </div>
          </div>
        </div>

        {/* Total Combined Current */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Сумарний Струм</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-extrabold font-mono ${isFleetCharging ? 'text-emerald-400' : isFleetDischarging ? 'text-amber-400' : 'text-slate-200'}`}>
              {totalCurrentA > 0 ? `+${totalCurrentA.toFixed(1)}` : totalCurrentA.toFixed(1)} <span className="text-sm font-normal text-slate-400">A</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
              {isFleetCharging ? (
                <span className="text-emerald-400 flex items-center font-medium"><ArrowUpRight className="w-3 h-3 mr-0.5" /> Зарядка флотилії</span>
              ) : isFleetDischarging ? (
                <span className="text-amber-400 flex items-center font-medium"><ArrowDownRight className="w-3 h-3 mr-0.5" /> Розрядка флотилії</span>
              ) : (
                <span>Режим очікування</span>
              )}
            </div>
          </div>
        </div>

        {/* Average System SOC */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Середній SOC Флотилії</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Battery className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-emerald-400 font-mono">{avgSoc}%</div>
            <div className="text-[11px] text-slate-400 mt-1">
              Ємність: <strong className="text-slate-200">{totalRemainingAh.toFixed(0)}</strong> / {totalNominalAh.toFixed(0)} Ah
            </div>
          </div>
        </div>

        {/* Extreme Cell Imbalance Across Fleet */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Екстремуми Осередків</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 space-y-1 text-[11px] font-mono">
            <div className="flex justify-between text-rose-400">
              <span>Min: {globalMinCell.voltage < 99 ? globalMinCell.voltage.toFixed(3) : '—'}V</span>
              <span className="text-slate-500 truncate max-w-[90px]">{globalMinCell.device}</span>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span>Max: {globalMaxCell.voltage > 0 ? globalMaxCell.voltage.toFixed(3) : '—'}V</span>
              <span className="text-slate-500 truncate max-w-[90px]">{globalMaxCell.device}</span>
            </div>
            <div className="text-slate-400 pt-0.5 border-t border-slate-800/80 flex justify-between">
              <span>ΔV Флотилії:</span>
              <strong className="text-amber-300">{globalDeltaMv} mV</strong>
            </div>
          </div>
        </div>
      </div>

      {/* BMS List Grid */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Список підключених BMS блоків ({filteredDevices.length})</h3>
          </div>
          <div className="text-xs text-slate-400">
            Онлайн: <strong className="text-emerald-400 font-mono">{onlineCount}</strong> / {totalCount}
          </div>
        </div>

        {filteredDevices.length === 0 ? (
          <div className="text-center py-12 text-slate-500 space-y-3">
            <Cpu className="w-12 h-12 mx-auto text-slate-700 animate-pulse" />
            <div className="text-sm font-semibold">Не знайдено жодного пристрою BMS у Supabase</div>
            <p className="text-xs max-w-md mx-auto text-slate-400">
              Перевірте, чи плата ESP32 відправляє дані у Supabase таблицю bms_telemetry, або скористайтесь кнопкою "Тест з'єднання" в налаштуваннях Supabase.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDevices.map((dev) => {
              const cellVoltages = dev.cell_voltages || [];
              const minCell = cellVoltages.length > 0 ? Math.min(...cellVoltages) : 0;
              const maxCell = cellVoltages.length > 0 ? Math.max(...cellVoltages) : 0;
              const deltaCellMv = cellVoltages.length > 0 ? Math.round((maxCell - minCell) * 1000) : 0;

              return (
                <div
                  key={dev.device_name}
                  className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all shadow-md flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                        <h4 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors truncate max-w-[150px]">
                          {dev.device_name}
                        </h4>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono border ${
                          dev.isOnline
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-500 border-slate-700'
                        }`}
                      >
                        {dev.isOnline ? '● Онлайн' : '○ Офлайн'}
                      </span>
                    </div>

                    {/* SOC Bar */}
                    <div className="space-y-1 mb-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Заряд (SOC)</span>
                        <span className="font-bold font-mono text-emerald-400">{dev.soc}%</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, dev.soc))}%` }}
                        />
                      </div>
                    </div>

                    {/* Telemetry Metrics */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 text-xs font-mono mb-3">
                      <div>
                        <div className="text-[10px] text-slate-500">Напруга (V):</div>
                        <div className="font-bold text-slate-200">{dev.total_voltage.toFixed(2)} V</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">Струм (A):</div>
                        <div className={`font-bold ${dev.current > 0 ? 'text-emerald-400' : dev.current < 0 ? 'text-amber-400' : 'text-slate-200'}`}>
                          {dev.current.toFixed(1)} A
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">Потужність (W):</div>
                        <div className="font-bold text-cyan-300">{dev.power.toFixed(0)} W</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">Осередки (S):</div>
                        <div className="font-bold text-slate-200">{cellVoltages.length}S ({deltaCellMv}mV)</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Timestamp */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-mono text-[10px]">
                      {new Date(dev.created_at).toLocaleTimeString('uk-UA')}
                    </span>
                    <button
                      onClick={() => {
                        supabaseService.setActiveDeviceName(dev.device_name);
                        onSelectBms(dev.device_name);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-semibold flex items-center space-x-1 transition-all"
                    >
                      <span>Огляд</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
