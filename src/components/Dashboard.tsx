import React, { useState, useEffect } from 'react';
import { bleManager } from '../lib/bleManager';
import { RuntimeEstimator } from './RuntimeEstimator';
import {
  Zap,
  Battery,
  ShieldCheck,
  AlertOctagon,
  Thermometer,
  Activity,
  Layers,
  Power,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Clock,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [, setTick] = useState(0);
  const [toggleLoading, setToggleLoading] = useState(false);

  useEffect(() => {
    return bleManager.subscribe(() => setTick((t) => t + 1));
  }, []);

  const bms = bleManager.bmsData;
  const isCharging = bms.current > 0.1;
  const isDischarging = bms.current < -0.1;

  // Compute SOC color
  const getSocColor = (soc: number) => {
    if (soc > 50) return 'text-emerald-400 stroke-emerald-500 bg-emerald-500/10 border-emerald-500/30';
    if (soc > 20) return 'text-amber-400 stroke-amber-500 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 stroke-rose-500 bg-rose-500/10 border-rose-500/30';
  };

  // Quick time estimate text
  let quickTimeEstimateStr = '';
  if (isDischarging && Math.abs(bms.current) > 0.1) {
    const hours = bms.remainingCapacity / Math.abs(bms.current);
    const totalMins = Math.floor(hours * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    quickTimeEstimateStr = h > 0 ? `~${h}г ${m}хв до 0%` : `~${m}хв до 0%`;
  } else if (isCharging && bms.current > 0.1) {
    const missing = Math.max(0, bms.nominalCapacity - bms.remainingCapacity);
    const hours = (missing / bms.current) * 1.05;
    const totalMins = Math.floor(hours * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    quickTimeEstimateStr = h > 0 ? `~${h}г ${m}хв до 100%` : `~${m}хв до 100%`;
  }

  const handleToggleChargeMos = async () => {
    try {
      setToggleLoading(true);
      await bleManager.setMosfetState(!bms.chargeMosEnabled, bms.dischargeMosEnabled);
    } finally {
      setToggleLoading(false);
    }
  };

  const handleToggleDischargeMos = async () => {
    try {
      setToggleLoading(true);
      await bleManager.setMosfetState(bms.chargeMosEnabled, !bms.dischargeMosEnabled);
    } finally {
      setToggleLoading(false);
    }
  };

  const protectionList = [
    { key: 'cellOverVoltage', label: 'Овервольтаж осередку (Cell OV)' },
    { key: 'cellUnderVoltage', label: 'Андервольтаж осередку (Cell UV)' },
    { key: 'packOverVoltage', label: 'Овервольтаж батареї (Pack OV)' },
    { key: 'packUnderVoltage', label: 'Андервольтаж батареї (Pack UV)' },
    { key: 'chargeOverTemp', label: 'Перегрів під час заряду' },
    { key: 'chargeUnderTemp', label: 'Переохолодження заряду' },
    { key: 'dischargeOverTemp', label: 'Перегрів під час розряду' },
    { key: 'dischargeUnderTemp', label: 'Переохолодження розряду' },
    { key: 'chargeOverCurrent', label: 'Перевищення струму заряду' },
    { key: 'dischargeOverCurrent', label: 'Перевищення струму розряду' },
    { key: 'shortCircuit', label: 'Коротке замикання (Short Circuit)' },
    { key: 'icError', label: 'Помилка чипу BMS (IC failure)' },
  ];

  const activeProtections = protectionList.filter(
    (item) => (bms.protection as any)?.[item.key]
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SOC Ring Gauge */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-xl">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-medium mb-3">
            Рівень Заряду (SOC)
          </div>

          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Track */}
              <circle
                cx="50"
                cy="50"
                r="42"
                className="stroke-slate-800"
                strokeWidth="9"
                fill="transparent"
              />
              {/* Progress */}
              <circle
                cx="50"
                cy="50"
                r="42"
                className={`transition-all duration-700 ease-out ${getSocColor(bms.soc).split(' ')[1]}`}
                strokeWidth="9"
                strokeDasharray={263.89}
                strokeDashoffset={263.89 - (263.89 * bms.soc) / 100}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="flex items-baseline space-x-1">
                <span className="text-4xl font-extrabold text-white tracking-tight">{bms.soc}</span>
                <span className="text-lg font-semibold text-slate-400">%</span>
              </div>
              <div className="flex items-center space-x-1 mt-1 text-xs font-medium">
                {isCharging ? (
                  <span className="text-emerald-400 flex items-center">
                    <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> Зарядка
                  </span>
                ) : isDischarging ? (
                  <span className="text-amber-400 flex items-center">
                    <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" /> Розрядка
                  </span>
                ) : (
                  <span className="text-slate-400">Спокій</span>
                )}
              </div>
              {quickTimeEstimateStr && (
                <div className="mt-1.5 px-2 py-0.5 rounded-md bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-cyan-300 font-semibold flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  <span>{quickTimeEstimateStr}</span>
                </div>
              )}
            </div>
          </div>

          {/* Remaining Capacity bar */}
          <div className="w-full mt-4 bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Залишкова Ємність</span>
              <span className="text-slate-200 font-mono font-semibold">
                {bms.remainingCapacity.toFixed(1)} / {bms.nominalCapacity.toFixed(0)} Ah
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (bms.remainingCapacity / (bms.nominalCapacity || 1)) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Primary Metrics Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Total Voltage */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Загальна Напруга</span>
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="my-2">
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                {bms.totalVoltage.toFixed(2)} <span className="text-sm font-normal text-slate-400">В</span>
              </div>
            </div>
            <div className="text-xs text-slate-400 flex justify-between pt-1 border-t border-slate-800/80">
              <span>Осередок (сер.):</span>
              <span className="text-slate-300 font-mono">
                {(bms.totalVoltage / (bms.cellCount || 1)).toFixed(3)} V
              </span>
            </div>
          </div>

          {/* Current */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Струм Акумулятора</span>
              <Activity
                className={`w-4 h-4 ${
                  isCharging ? 'text-emerald-400' : isDischarging ? 'text-amber-400' : 'text-slate-400'
                }`}
              />
            </div>
            <div className="my-2">
              <div
                className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${
                  isCharging ? 'text-emerald-400' : isDischarging ? 'text-amber-400' : 'text-white'
                }`}
              >
                {bms.current > 0 ? `+${bms.current.toFixed(1)}` : bms.current.toFixed(1)}{' '}
                <span className="text-sm font-normal text-slate-400">А</span>
              </div>
            </div>
            <div className="text-xs text-slate-400 flex justify-between pt-1 border-t border-slate-800/80">
              <span>Напрямок:</span>
              <span className="text-slate-300">
                {isCharging ? 'Заряджання' : isDischarging ? 'Розряджання' : 'Без струму'}
              </span>
            </div>
          </div>

          {/* Power */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Потужність</span>
              <Power className="w-4 h-4 text-blue-400" />
            </div>
            <div className="my-2">
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                {Math.abs(bms.power) >= 1000
                  ? (bms.power / 1000).toFixed(2)
                  : Math.abs(bms.power).toFixed(0)}{' '}
                <span className="text-sm font-normal text-slate-400">
                  {Math.abs(bms.power) >= 1000 ? 'кВт' : 'Вт'}
                </span>
              </div>
            </div>
            <div className="text-xs text-slate-400 flex justify-between pt-1 border-t border-slate-800/80">
              <span>Режим:</span>
              <span className="text-slate-300">
                {bms.power > 0 ? 'Вхідна' : bms.power < 0 ? 'Споживання' : '0 Вт'}
              </span>
            </div>
          </div>

          {/* Delta Voltage */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Різниця Осередків (ΔV)</span>
              <Layers className="w-4 h-4 text-purple-400" />
            </div>
            <div className="my-2">
              <div
                className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${
                  bms.deltaVoltage <= 15
                    ? 'text-emerald-400'
                    : bms.deltaVoltage <= 40
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {bms.deltaVoltage} <span className="text-sm font-normal text-slate-400">мВ</span>
              </div>
            </div>
            <div className="text-xs text-slate-400 flex justify-between pt-1 border-t border-slate-800/80">
              <span>Баланс:</span>
              <span className="text-slate-300">
                {bms.deltaVoltage <= 15 ? 'Відмінний' : bms.deltaVoltage <= 40 ? 'Норма' : 'Потрібен баланс'}
              </span>
            </div>
          </div>

          {/* Cycles Count */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Цикли Циклів</span>
              <RefreshCw className="w-4 h-4 text-teal-400" />
            </div>
            <div className="my-2">
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                {bms.cycleCount}{' '}
                <span className="text-sm font-normal text-slate-400">циклів</span>
              </div>
            </div>
            <div className="text-xs text-slate-400 flex justify-between pt-1 border-t border-slate-800/80">
              <span>Дата випуску:</span>
              <span className="text-slate-300 font-mono">{bms.productionDate || 'N/A'}</span>
            </div>
          </div>

          {/* Cell Count & High/Low Cell summary */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Осередок МAX / MIN</span>
              <Battery className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="my-1 space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-purple-300 font-medium">MAX (№{bms.maxCellIndex}):</span>
                <span className="font-mono text-white font-bold">{bms.maxCellVoltage.toFixed(3)} V</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-amber-300 font-medium">MIN (№{bms.minCellIndex}):</span>
                <span className="font-mono text-white font-bold">{bms.minCellVoltage.toFixed(3)} V</span>
              </div>
            </div>
            <div className="text-xs text-slate-400 flex justify-between pt-1 border-t border-slate-800/80">
              <span>Конфігурація:</span>
              <span className="text-slate-300 font-semibold">{bms.cellCount}S</span>
            </div>
          </div>
        </div>
      </div>

      {/* Remaining Runtime & Time to Charge Estimation Module */}
      <RuntimeEstimator />

      {/* Middle Row: MOSFET Switches & Temperature Sensors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* MOSFET Controls Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Power className="w-5 h-5 text-cyan-400" />
                <span>Керування Ключами MOSFET</span>
              </h3>
              <p className="text-xs text-slate-400">Увімкнення/Вимкнення портів Заряду та Розряду BMS</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Charge MOS */}
            <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-200">Зарядний ключ (CHG)</span>
                  <span
                    className={`w-3 h-3 rounded-full ${
                      bms.chargeMosEnabled ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-rose-500'
                    }`}
                  ></span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Дозволяє/забороняє вхідний струм від зарядного пристрою чи сонячних панелей.
                </p>
              </div>

              <button
                id="btn-toggle-charge-mos"
                disabled={toggleLoading}
                onClick={handleToggleChargeMos}
                className={`w-full py-2 px-3 rounded-lg font-medium text-xs flex items-center justify-center space-x-2 transition-all ${
                  bms.chargeMosEnabled
                    ? 'bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/30'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/30'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{bms.chargeMosEnabled ? 'Вимкнути Заряд' : 'Увімкнути Заряд'}</span>
              </button>
            </div>

            {/* Discharge MOS */}
            <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-200">Розрядний ключ (DSG)</span>
                  <span
                    className={`w-3 h-3 rounded-full ${
                      bms.dischargeMosEnabled ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-rose-500'
                    }`}
                  ></span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Дозволяє/забороняє віддачу струму на інвертор чи споживачі.
                </p>
              </div>

              <button
                id="btn-toggle-discharge-mos"
                disabled={toggleLoading}
                onClick={handleToggleDischargeMos}
                className={`w-full py-2 px-3 rounded-lg font-medium text-xs flex items-center justify-center space-x-2 transition-all ${
                  bms.dischargeMosEnabled
                    ? 'bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/30'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/30'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{bms.dischargeMosEnabled ? 'Вимкнути Розряд' : 'Увімкнути Розряд'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Temperature Sensors Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-amber-400" />
                <span>Температурні Датчики (NTC)</span>
              </h3>
              <p className="text-xs text-slate-400">Моніторинг температури осередків та платформи MOSFET</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {bms.temperatures && bms.temperatures.length > 0 ? (
              bms.temperatures.map((temp, index) => (
                <div key={index} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-xs text-slate-400 font-medium">
                    {index === 0 ? 'NTC1 (Осередки)' : index === 1 ? 'NTC2 (Батарея)' : `NTC${index + 1} (MOSFET)`}
                  </span>
                  <div className="my-2 flex items-baseline justify-between">
                    <span className="text-xl font-bold font-mono text-white">{temp.toFixed(1)}</span>
                    <span className="text-xs font-medium text-slate-400">°C</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        temp > 50 ? 'bg-rose-500' : temp > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, (temp / 80) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-6 text-slate-500 text-xs">
                Температурні датчики не підключені або дані відсутні
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Protection Alarms & Safety Status */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <AlertOctagon className={`w-5 h-5 ${activeProtections.length > 0 ? 'text-rose-500' : 'text-emerald-400'}`} />
            <h3 className="text-base font-bold text-white">Стан Захисту Акумулятора (Protection Status)</h3>
          </div>
          {activeProtections.length === 0 && (
            <span className="text-xs text-emerald-400 font-medium flex items-center bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Аварійних тривог немає
            </span>
          )}
        </div>

        {activeProtections.length > 0 ? (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">
            <p className="text-xs font-semibold text-rose-400 mb-2">Виявлено активні спрацьовування захисту:</p>
            <div className="flex flex-wrap gap-2">
              {activeProtections.map((prot) => (
                <span key={prot.key} className="px-3 py-1 rounded-lg bg-rose-600 text-white font-medium text-xs shadow">
                  ⚠️ {prot.label}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {protectionList.map((item) => {
            const isActive = (bms.protection as any)?.[item.key];
            return (
              <div
                key={item.key}
                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                  isActive
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 font-semibold'
                    : 'bg-slate-950/50 border-slate-800/80 text-slate-400'
                }`}
              >
                <span className="truncate pr-1">{item.label}</span>
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isActive ? 'bg-rose-500 shadow-sm shadow-rose-500' : 'bg-slate-700'
                  }`}
                ></span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
