import React, { useState } from 'react';
import { bleManager } from '../lib/bleManager';
import {
  Clock,
  Zap,
  BatteryCharging,
  Battery,
  ArrowDownRight,
  ArrowUpRight,
  Hourglass,
  Sliders,
  Sparkles,
  Info,
  ShieldCheck,
} from 'lucide-react';

export const RuntimeEstimator: React.FC = () => {
  const bms = bleManager.bmsData;
  const current = bms.current;
  const isCharging = current > 0.1;
  const isDischarging = current < -0.1;

  // Custom simulator load state
  const [customWattLoad, setCustomWattLoad] = useState<number>(200);

  // Math for current live state
  let timeSeconds = 0;
  let etaString = '';
  let modeLabel = '';

  if (isDischarging) {
    const dischargeCurrentA = Math.abs(current);
    const hoursRemaining = bms.remainingCapacity / (dischargeCurrentA || 0.001);
    timeSeconds = hoursRemaining * 3600;

    const etaDate = new Date(Date.now() + timeSeconds * 1000);
    etaString = etaDate.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    modeLabel = 'До повного розряду (0%)';
  } else if (isCharging) {
    const chargeCurrentA = current;
    const missingCapacity = Math.max(0, bms.nominalCapacity - bms.remainingCapacity);
    // Assuming 95% charging efficiency for LiFePO4 / NMC
    const hoursToFull = (missingCapacity / (chargeCurrentA || 0.001)) * 1.05;
    timeSeconds = hoursToFull * 3600;

    const etaDate = new Date(Date.now() + timeSeconds * 1000);
    etaString = etaDate.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    modeLabel = 'До повного заряду (100%)';
  }

  // Format hours and minutes
  const formatTimeText = (seconds: number) => {
    if (seconds <= 0 || !isFinite(seconds)) return '—';
    const totalMins = Math.floor(seconds / 60);
    if (totalMins > 99 * 60) return '99+ годин';

    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;

    if (h === 0) return `${m} хв`;
    if (m === 0) return `${h} год`;
    return `${h} год ${m} хв`;
  };

  // Custom Simulator Math
  const customCurrentA = customWattLoad / (bms.totalVoltage || 51.2);
  const customHoursRemaining = bms.remainingCapacity / (customCurrentA || 0.001);
  const customSeconds = customHoursRemaining * 3600;

  // Preset appliances for Ukrainian power backup scenarios
  const presets = [
    { label: 'Wi-Fi Роутер', watts: 15 },
    { label: 'Газовий Котел', watts: 100 },
    { label: 'Холодильник', watts: 150 },
    { label: 'Ноутбук + Освітлення', watts: 250 },
    { label: 'Інвертор 1 кВт (Сер. навантаж)', watts: 500 },
    { label: 'Повний дім (2 кВт)', watts: 2000 },
  ];

  const totalWhRemaining = Math.round(bms.remainingCapacity * bms.totalVoltage);
  const totalWhNominal = Math.round(bms.nominalCapacity * bms.totalVoltage);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <span>Оцінка Часу Роботи & Зарядки</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Розрахунок тривалості автономної роботи та часу повного заряду на основі вимірів струму JBD BMS
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {isCharging ? (
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center">
              <BatteryCharging className="w-4 h-4 mr-1.5 animate-pulse" />
              Заряджання (+{bms.current.toFixed(1)} A)
            </span>
          ) : isDischarging ? (
            <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center">
              <ArrowDownRight className="w-4 h-4 mr-1.5 animate-pulse" />
              Розряджання ({bms.current.toFixed(1)} A)
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-semibold flex items-center">
              <Battery className="w-4 h-4 mr-1.5 text-slate-500" />
              Режим Спокою (0 A)
            </span>
          )}
        </div>
      </div>

      {/* Main Real-Time Estimation Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Large Time Hero Display */}
        <div className="md:col-span-2 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
            <Hourglass className="w-32 h-32 text-cyan-400" />
          </div>

          <div className="relative z-10">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>{isCharging ? 'Очікуваний час до 100%:' : isDischarging ? 'Очікуваний залишковий час:' : 'Стан батареї:'}</span>
            </div>

            <div className="my-3 flex items-baseline space-x-3">
              <span className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight">
                {isCharging || isDischarging ? formatTimeText(timeSeconds) : 'Необмежено'}
              </span>
              {(isCharging || isDischarging) && (
                <span className="text-xs sm:text-sm text-cyan-400 font-mono font-semibold bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-800/50">
                  ETA ~ {etaString}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400">
              {isCharging
                ? `При поточному струмі заряду ${bms.current.toFixed(1)}A батарея буде повністю заряджена приблизно о ${etaString}.`
                : isDischarging
                ? `При поточному споживанні ${Math.abs(bms.current).toFixed(1)}A (${Math.abs(bms.power).toFixed(0)} Вт) акумулятор розрядиться о ${etaString}.`
                : 'Без навантаження акумулятор зберігає постійний рівень заряду.'}
            </p>
          </div>

          {/* Detailed Metric Strip */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-800/80 text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block">Залишкова Ємність</span>
              <span className="text-slate-200 font-bold">{bms.remainingCapacity.toFixed(1)} Ah</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Залишкова Енергія</span>
              <span className="text-cyan-300 font-bold">{totalWhRemaining} Wh</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Потужність P</span>
              <span className={bms.power > 0 ? 'text-emerald-400 font-bold' : bms.power < 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                {Math.abs(bms.power).toFixed(0)} W
              </span>
            </div>
          </div>
        </div>

        {/* Battery Health & Wh Breakdown */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-300 block mb-2">Енергетичний Запас (Wh)</span>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Номінальна енергія:</span>
                <span className="font-mono text-slate-200 font-semibold">{totalWhNominal} Wh</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Наявний запас:</span>
                <span className="font-mono text-cyan-400 font-bold">{totalWhRemaining} Wh</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Напруга збірки:</span>
                <span className="font-mono text-slate-200">{bms.totalVoltage.toFixed(2)} V</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Швидкість зміни SOC:</span>
                <span className="font-mono text-slate-300 font-medium">
                  {isDischarging
                    ? `-${((Math.abs(bms.current) / bms.nominalCapacity) * 100).toFixed(1)} %/год`
                    : isCharging
                    ? `+${((bms.current / bms.nominalCapacity) * 100).toFixed(1)} %/год`
                    : '0 %/год'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Оцінка враховує падіння напруги під навантаженням</span>
          </div>
        </div>
      </div>

      {/* Interactive Load Simulator / Time Predictor */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-bold text-slate-200">Симулятор Залишкового Часу для Довільних Навантажень</h4>
          </div>
          <span className="text-xs text-slate-400">
            Оцінка тривалості автономності при вибраній потужності (Вт)
          </span>
        </div>

        {/* Preset quick buttons */}
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setCustomWattLoad(preset.watts)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                customWattLoad === preset.watts
                  ? 'bg-cyan-600/30 text-cyan-300 border-cyan-500/50 shadow-sm'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
              }`}
            >
              {preset.label} ({preset.watts}W)
            </button>
          ))}
        </div>

        {/* Custom Range Slider & Output */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center pt-2">
          <div className="sm:col-span-2 space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">Потужність споживання:</span>
              <span className="text-cyan-400 font-mono font-bold">{customWattLoad} Вт (~{customCurrentA.toFixed(1)} A)</span>
            </div>
            <input
              type="range"
              min="10"
              max="3000"
              step="10"
              value={customWattLoad}
              onChange={(e) => setCustomWattLoad(Number(e.target.value))}
              className="w-full accent-cyan-500"
            />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
            <span className="text-[11px] text-slate-400 block font-medium">Прогнозована тривалість</span>
            <span className="text-xl font-extrabold text-cyan-300 font-mono">
              {formatTimeText(customSeconds)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
