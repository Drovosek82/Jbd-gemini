import React, { useState, useEffect } from 'react';
import { bleManager } from '../lib/bleManager';
import { BmsParameters, BatteryChemistry } from '../types/bms';
import { Settings, Save, RefreshCw, Upload, Download, Key, CheckCircle, ShieldAlert } from 'lucide-react';

export const ParameterSettings: React.FC = () => {
  const [, setTick] = useState(0);
  const [params, setParams] = useState<BmsParameters>({ ...bleManager.parameters });
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    return bleManager.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  const handleChange = (key: keyof BmsParameters, value: any) => {
    setParams((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSelectPreset = (chem: BatteryChemistry, sCount: number) => {
    if (chem === 'Custom') return;
    bleManager.applyChemistryPreset(chem, sCount);
    setParams({ ...bleManager.parameters });
  };

  const handleReadFromBms = async () => {
    try {
      await bleManager.sendCommand(0x03, 'Зчитати поточні налаштування з BMS');
      setParams({ ...bleManager.parameters });
      setSaveSuccessMsg('Налаштування успішно зчитано з BMS!');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    } catch (e: any) {
      alert('Помилка зчитування: ' + e.message);
    }
  };

  const handleSaveClick = () => {
    setPinInput('');
    setPinError('');
    setShowPinModal(true);
  };

  const handleConfirmWrite = async () => {
    if (pinInput !== '123456' && pinInput !== '000000') {
      setPinError('Невірний пароль! (За замовчуванням: 123456)');
      return;
    }

    try {
      setIsSaving(true);
      await bleManager.saveParameters(params);
      setShowPinModal(false);
      setSaveSuccessMsg('Параметри успішно збережені та записані в BMS!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (e: any) {
      setPinError('Помилка запису: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(params, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `jbd_bms_config_${params.chemistry}_${params.cellCount}S.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        setParams({ ...params, ...imported });
        setSaveSuccessMsg('Профіль конфігурації завантажено з файлу!');
        setTimeout(() => setSaveSuccessMsg(''), 3000);
      } catch (err) {
        alert('Помилка читання JSON файлу конфігурації');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Presets */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-4 border-b border-slate-800 gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-cyan-400" />
              <span>Налаштування Параметрів BMS (EEPROM Config)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Встановлення порогів захисту, струмів, температур та умов балансування
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleReadFromBms}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Зчитати з BMS</span>
            </button>

            <label className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Імпорт JSON</span>
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>

            <button
              onClick={handleExportJSON}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Експорт JSON</span>
            </button>

            <button
              id="btn-save-params"
              onClick={handleSaveClick}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center space-x-2 shadow-lg shadow-cyan-900/40"
            >
              <Save className="w-4 h-4" />
              <span>Записати в BMS</span>
            </button>
          </div>
        </div>

        {/* Success toast message */}
        {saveSuccessMsg && (
          <div className="mb-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl text-xs flex items-center space-x-2 animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Quick Chemistry Presets Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-2 block">
            Швидкі Шаблони (Chemistry Presets):
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { chem: 'LiFePO4', s: 4, label: 'LiFePO4 4S (12V)' },
              { chem: 'LiFePO4', s: 8, label: 'LiFePO4 8S (24V)' },
              { chem: 'LiFePO4', s: 16, label: 'LiFePO4 16S (48V)' },
              { chem: 'Li-ion', s: 3, label: 'Li-ion 3S (12V)' },
              { chem: 'Li-ion', s: 7, label: 'Li-ion 7S (24V)' },
              { chem: 'Li-ion', s: 13, label: 'Li-ion 13S (48V)' },
              { chem: 'Li-ion', s: 14, label: 'Li-ion 14S (52V)' },
              { chem: 'LTO', s: 6, label: 'LTO 6S (14V)' },
              { chem: 'LTO', s: 12, label: 'LTO 12S (28V)' },
            ].map((p) => (
              <button
                key={`${p.chem}-${p.s}`}
                onClick={() => handleSelectPreset(p.chem as BatteryChemistry, p.s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  params.chemistry === p.chem && params.cellCount === p.s
                    ? 'bg-cyan-600 text-white border-cyan-400 shadow'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Settings Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Cell Voltages Protection */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wider border-b border-slate-800 pb-2">
            1. Захист по Осередках (Cell Voltages)
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Овервольтаж осередку (OV)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.005"
                  value={params.cellOverVoltage}
                  onChange={(e) => handleChange('cellOverVoltage', parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500">В</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Відновлення OV (Release)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.005"
                  value={params.cellOverVoltageRelease}
                  onChange={(e) => handleChange('cellOverVoltageRelease', parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500">В</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Андервольтаж осередку (UV)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.005"
                  value={params.cellUnderVoltage}
                  onChange={(e) => handleChange('cellUnderVoltage', parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500">В</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Відновлення UV (Release)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.005"
                  value={params.cellUnderVoltageRelease}
                  onChange={(e) => handleChange('cellUnderVoltageRelease', parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500">В</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Pack Voltages Protection */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wider border-b border-slate-800 pb-2">
            2. Захист Загальної Батареї (Pack Voltages)
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Овервольтаж батареї (Pack OV)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={params.packOverVoltage}
                  onChange={(e) => handleChange('packOverVoltage', parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500">В</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Андервольтаж батареї (Pack UV)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={params.packUnderVoltage}
                  onChange={(e) => handleChange('packUnderVoltage', parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500">В</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Кількість Осередків (S)</label>
              <input
                type="number"
                value={params.cellCount}
                onChange={(e) => handleChange('cellCount', parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Номінальна Ємність (Ah)</label>
              <div className="relative">
                <input
                  type="number"
                  value={params.nominalCapacity}
                  onChange={(e) => handleChange('nominalCapacity', parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500">Ah</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Current Limits */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wider border-b border-slate-800 pb-2">
            3. Обмеження Струму (Current Protections)
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Макс. струм заряду (COTP)</label>
              <div className="relative">
                <input
                  type="number"
                  value={params.chargeOverCurrent}
                  onChange={(e) => handleChange('chargeOverCurrent', parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500">А</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Макс. струм розряду (DOTP)</label>
              <div className="relative">
                <input
                  type="number"
                  value={params.dischargeOverCurrent}
                  onChange={(e) => handleChange('dischargeOverCurrent', parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500">А</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Balancing Parameters */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wider border-b border-slate-800 pb-2">
            4. Параметри Балансування (Balancing)
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Початок балансу (Start V)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.005"
                  value={params.balanceStartVoltage}
                  onChange={(e) => handleChange('balanceStartVoltage', parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500">В</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Мін. різниця (Balance Delta)</label>
              <div className="relative">
                <input
                  type="number"
                  value={params.balanceDeltaVoltage}
                  onChange={(e) => handleChange('balanceDeltaVoltage', parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500">мВ</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PIN Confirmation Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-cyan-400">
              <Key className="w-6 h-6" />
              <h3 className="font-bold text-lg text-white">Підтвердження Запису в EEPROM</h3>
            </div>

            <p className="text-xs text-slate-300">
              Для збереження нових параметрів захисту в пам'ять JBD BMS введіть пароль доступу.
            </p>

            <div>
              <label className="text-xs text-slate-400 block mb-1 font-semibold">
                Пароль BMS (Стандартний: 123456):
              </label>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="123456"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-center text-lg font-mono tracking-widest text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {pinError && (
              <div className="text-xs text-rose-400 flex items-center space-x-1">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowPinModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Скасувати
              </button>
              <button
                onClick={handleConfirmWrite}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center space-x-1"
              >
                {isSaving ? 'Запис...' : 'Підтвердити Запис'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
