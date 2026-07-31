import React, { useState, useEffect } from 'react';
import { bleManager } from '../lib/bleManager';
import { NotificationThresholds, AlertNotificationItem, AlertSeverity } from '../types/bms';
import { playWarningBeep, playDangerAlarm } from '../lib/soundAlerts';
import {
  Bell,
  Volume2,
  VolumeX,
  ShieldAlert,
  Battery,
  Thermometer,
  Zap,
  Activity,
  Layers,
  Save,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Info,
  Check,
  RotateCcw,
} from 'lucide-react';

export const NotificationSettings: React.FC = () => {
  const [, setTick] = useState(0);
  const [formState, setFormState] = useState<NotificationThresholds>({ ...bleManager.thresholds });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'danger' | 'warning' | 'info'>('all');

  useEffect(() => {
    return bleManager.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  useEffect(() => {
    setFormState({ ...bleManager.thresholds });
  }, [bleManager.thresholds]);

  const handleChange = (key: keyof NotificationThresholds, value: number | boolean) => {
    setFormState((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    bleManager.saveThresholds(formState);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleResetDefault = () => {
    const defaultVals: NotificationThresholds = {
      socLow: 20,
      socCriticalLow: 10,
      socHigh: 95,
      socEnabled: true,
      tempHigh: 45,
      tempCriticalHigh: 55,
      tempLow: 0,
      tempEnabled: true,
      voltageLow: 44.0,
      voltageHigh: 58.4,
      voltageEnabled: true,
      currentDischargeMax: 100,
      currentChargeMax: 50,
      currentEnabled: true,
      deltaVoltageMax: 40,
      deltaEnabled: true,
      soundEnabled: true,
      browserNotificationsEnabled: bleManager.thresholds.browserNotificationsEnabled,
    };
    setFormState(defaultVals);
    bleManager.saveThresholds(defaultVals);
  };

  const handleTestBeep = () => {
    playWarningBeep();
  };

  const handleTestAlarm = () => {
    playDangerAlarm();
  };

  const handleEnableDesktopNotifs = async () => {
    const granted = await bleManager.requestBrowserNotificationPermission();
    if (granted) {
      setFormState((prev) => ({ ...prev, browserNotificationsEnabled: true }));
    } else {
      alert('Дозвіл на сповіщення браузера відхилено у налаштуваннях браузера.');
    }
  };

  const notifications = bleManager.notifications;
  const filteredNotifications = notifications.filter(
    (n) => filterSeverity === 'all' || n.severity === filterSeverity
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-cyan-400" />
            <span>Система Сповіщень та Порогові Значення</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Налаштування автоматичних звукових та візуальних тривог при досягненні порогових рівнів заряду, напруги та температури
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleTestBeep}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Тест Звук Увага</span>
          </button>
          <button
            type="button"
            onClick={handleTestAlarm}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            <span>Тест Тривога!</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Global Sound & Push Notifications Toggle */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <span>Канали сповіщень (Звук та Браузер)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Audio Toggle */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2.5 rounded-xl ${formState.soundEnabled ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
                  {formState.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-200">Звукові тривоги</div>
                  <div className="text-xs text-slate-400">Звуковий сигнал при виникненні тривоги</div>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.soundEnabled}
                  onChange={(e) => handleChange('soundEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>

            {/* Desktop Push Notifications */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2.5 rounded-xl ${formState.browserNotificationsEnabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}>
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-200">Сповіщення ОС</div>
                  <div className="text-xs text-slate-400">Push-сповіщення у фоні</div>
                </div>
              </div>

              {formState.browserNotificationsEnabled ? (
                <span className="text-xs text-emerald-400 font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center">
                  <Check className="w-3.5 h-3.5 mr-1" /> Увімкнено
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleEnableDesktopNotifs}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                >
                  Дозволити
                </button>
              )}
            </div>

            {/* Auto Reconnect Toggle */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2.5 rounded-xl ${bleManager.autoReconnectEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-200">Авто-перепідключення</div>
                  <div className="text-xs text-slate-400">Відновлення зв'язку при розриві</div>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={bleManager.autoReconnectEnabled}
                  onChange={(e) => bleManager.setAutoReconnectEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Custom Threshold Parameters Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Charge Level Thresholds (SOC %) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Battery className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">Рівень Заряду (SOC %)</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.socEnabled}
                  onChange={(e) => handleChange('socEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex justify-between">
                  <span>Низький рівень (Увага):</span>
                  <span className="text-amber-400 font-mono font-bold">≤ {formState.socLow}%</span>
                </label>
                <input
                  type="range"
                  min="15"
                  max="40"
                  value={formState.socLow}
                  onChange={(e) => handleChange('socLow', Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex justify-between">
                  <span>Критично низький (Тривога!):</span>
                  <span className="text-rose-400 font-mono font-bold">≤ {formState.socCriticalLow}%</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="20"
                  value={formState.socCriticalLow}
                  onChange={(e) => handleChange('socCriticalLow', Number(e.target.value))}
                  className="w-full accent-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex justify-between">
                  <span>Повний заряд (Інфо):</span>
                  <span className="text-emerald-400 font-mono font-bold">≥ {formState.socHigh}%</span>
                </label>
                <input
                  type="range"
                  min="85"
                  max="100"
                  value={formState.socHigh}
                  onChange={(e) => handleChange('socHigh', Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* 2. Temperature Thresholds (°C) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Thermometer className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">Температура (°C)</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.tempEnabled}
                  onChange={(e) => handleChange('tempEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex justify-between">
                  <span>Висока температура (Увага):</span>
                  <span className="text-amber-400 font-mono font-bold">≥ {formState.tempHigh}°C</span>
                </label>
                <input
                  type="range"
                  min="35"
                  max="60"
                  value={formState.tempHigh}
                  onChange={(e) => handleChange('tempHigh', Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex justify-between">
                  <span>Критичний перегрів (Тривога!):</span>
                  <span className="text-rose-400 font-mono font-bold">≥ {formState.tempCriticalHigh}°C</span>
                </label>
                <input
                  type="range"
                  min="50"
                  max="75"
                  value={formState.tempCriticalHigh}
                  onChange={(e) => handleChange('tempCriticalHigh', Number(e.target.value))}
                  className="w-full accent-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex justify-between">
                  <span>Низька температура (Мороз):</span>
                  <span className="text-cyan-400 font-mono font-bold">≤ {formState.tempLow}°C</span>
                </label>
                <input
                  type="range"
                  min="-10"
                  max="15"
                  value={formState.tempLow}
                  onChange={(e) => handleChange('tempLow', Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* 3. Voltage Thresholds (V) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100">Напруга Батареї (V)</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.voltageEnabled}
                  onChange={(e) => handleChange('voltageEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Мін. Напруга (V)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formState.voltageLow}
                  onChange={(e) => handleChange('voltageLow', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Макс. Напруга (V)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formState.voltageHigh}
                  onChange={(e) => handleChange('voltageHigh', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 4. Current & Imbalance Thresholds */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-slate-100">Струм (A) та Розбаланс (ΔV)</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.currentEnabled}
                  onChange={(e) => handleChange('currentEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Макс. Розряд (A)</label>
                <input
                  type="number"
                  value={formState.currentDischargeMax}
                  onChange={(e) => handleChange('currentDischargeMax', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Макс. Заряд (A)</label>
                <input
                  type="number"
                  value={formState.currentChargeMax}
                  onChange={(e) => handleChange('currentChargeMax', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Макс. ΔV (mV)</label>
                <input
                  type="number"
                  value={formState.deltaVoltageMax}
                  onChange={(e) => handleChange('deltaVoltageMax', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <button
            type="button"
            onClick={handleResetDefault}
            className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Скинути за замовчуванням</span>
          </button>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            {saveSuccess && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" /> Пороги успішно збережено!
              </span>
            )}
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-cyan-900/30 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Зберегти Пороги</span>
            </button>
          </div>
        </div>
      </form>

      {/* Triggered Notifications Log & History */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <span>Журнал Зафіксованих Сповіщень</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-xs font-bold">
                  {unreadCount} нових
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Історія спрацьовування порогів напруги, струму та температури
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Filter buttons */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(['all', 'danger', 'warning', 'info'] as const).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setFilterSeverity(sev)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg capitalize transition-colors ${
                    filterSeverity === sev ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sev === 'all' ? 'Всі' : sev === 'danger' ? 'Тривога' : sev === 'warning' ? 'Увага' : 'Інфо'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => bleManager.clearNotifications()}
              disabled={notifications.length === 0}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/30 text-rose-400 border border-slate-700 text-xs font-medium flex items-center space-x-1 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Очистити</span>
            </button>
          </div>
        </div>

        {/* Notifications Feed */}
        {filteredNotifications.length > 0 ? (
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
            {filteredNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => bleManager.markNotificationAsRead(n.id)}
                className={`p-3.5 rounded-xl border transition-all flex items-start justify-between cursor-pointer ${
                  n.severity === 'danger'
                    ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                    : n.severity === 'warning'
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                    : 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200'
                } ${!n.isRead ? 'ring-1 ring-white/20' : 'opacity-80'}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    {n.severity === 'danger' ? (
                      <AlertTriangle className="w-5 h-5 text-rose-500" />
                    ) : n.severity === 'warning' ? (
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    ) : (
                      <Info className="w-5 h-5 text-cyan-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs sm:text-sm text-white">{n.title}</span>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{n.message}</p>
                    <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-2 font-mono">
                      <span>Час: {n.timestamp}</span>
                      <span>Значення: <strong className="text-white">{n.currentValue}</strong></span>
                      {n.thresholdValue && <span>Поріг: <strong className="text-slate-300">{n.thresholdValue}</strong></span>}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
                  {n.severity}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500 text-xs">
            Немає зафіксованих сповіщень. Акумулятор працює у межах встановлених норм.
          </div>
        )}
      </div>
    </div>
  );
};
