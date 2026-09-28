import React, { useState, useEffect } from 'react';
import { supabaseService, SupabaseBmsRecord } from '../lib/supabaseService';
import { SupabaseSyncSettings } from './SupabaseSyncSettings';
import { FleetDashboard } from './FleetDashboard';
import {
  Cloud,
  Database,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Search,
  Layers,
  Settings,
  ShieldAlert,
  CheckCircle2,
  Check,
  X,
  Server,
  Zap,
} from 'lucide-react';

interface SupabaseDashboardProps {
  onSelectBms?: (deviceName: string) => void;
  onChangeTab?: (tab: string) => void;
}

interface PrivacyLockScreenProps {
  onGoToSettings: () => void;
}

const PrivacyLockScreen: React.FC<PrivacyLockScreenProps> = ({ onGoToSettings }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 max-w-2xl mx-auto shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-rose-500/5 rounded-full filter blur-3xl -z-10"></div>
      
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-950/20">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white tracking-tight">Режим Приватності Активовано</h3>
        <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
          Для безпеки та запобігання перегляду чужої телеметрії або випадкового прошивання сторонніх пристроїв, доступ до хмарної флотилії та прошивки заблоковано на публічній базі даних.
        </p>
      </div>

      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left space-y-3">
        <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
          <span>⚙️</span> Щоб розблокувати повний функціонал:
        </h4>
        <ul className="text-[11px] text-slate-300 space-y-2 list-decimal list-inside pl-1 leading-normal">
          <li>Перейдіть до вкладки <strong>Налаштування & SQL</strong>.</li>
          <li>Встановіть режим користувача в <strong>Експертний (Expert Mode)</strong>.</li>
          <li>Введіть <strong>власні реквізити</strong> вашого проекту Supabase (URL та Anon Key).</li>
          <li>Створіть свій <strong>персональний акаунт</strong> (Реєстрація) та увійдіть в нього.</li>
        </ul>
      </div>

      <button
        onClick={onGoToSettings}
        className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-cyan-950/50 transition-all flex items-center justify-center space-x-2 mx-auto cursor-pointer"
      >
        <Settings className="w-4 h-4" />
        <span>Налаштувати Власний Supabase</span>
      </button>
    </div>
  );
};

export const SupabaseDashboard: React.FC<SupabaseDashboardProps> = ({ onSelectBms, onChangeTab }) => {
  const [subTab, setSubTab] = useState<'fleet' | 'settings' | 'manage'>('fleet');
  const [, setTick] = useState(0);

  // Management State
  const [devices, setDevices] = useState<SupabaseBmsRecord[]>(supabaseService.devicesList);
  const [searchBms, setSearchBms] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Confirmation Modals
  const [deleteTargetDevice, setDeleteTargetDevice] = useState<string | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  useEffect(() => {
    const unsub = supabaseService.subscribe(() => {
      setTick((t) => t + 1);
      setDevices([...supabaseService.devicesList]);
    });
    return unsub;
  }, []);

  const config = supabaseService.config;
  const status = supabaseService.status;
  const isLocked = !supabaseService.authUser;

  const handleRefresh = async () => {
    setIsDeleting(true);
    await supabaseService.fetchAllDevicesTelemetry();
    setIsDeleting(false);
  };

  const handleDeleteDevice = async (deviceName: string) => {
    setIsDeleting(true);
    setActionMsg(null);
    const res = await supabaseService.deleteDeviceRecords(deviceName);
    setIsDeleting(false);
    setDeleteTargetDevice(null);
    if (res.success) {
      setActionMsg({ type: 'success', text: res.message });
    } else {
      setActionMsg({ type: 'error', text: res.message });
    }
  };

  const handleClearAll = async () => {
    setIsDeleting(true);
    setActionMsg(null);
    const res = await supabaseService.deleteAllTelemetry();
    setIsDeleting(false);
    setShowClearAllModal(false);
    if (res.success) {
      setActionMsg({ type: 'success', text: res.message });
    } else {
      setActionMsg({ type: 'error', text: res.message });
    }
  };

  const filteredDevices = devices.filter((d) =>
    d.device_name.toLowerCase().includes(searchBms.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Main Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-cyan-400 border border-cyan-500/30">
            <Cloud className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Supabase Cloud Моніторинг</h2>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border ${
                config.enabled
                  ? status.status === 'error'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-500 border-slate-700'
              }`}>
                {config.enabled ? (status.status === 'error' ? 'Помилка З’єднання' : 'Подключено (Онлайн)') : 'Вимкнено'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Централізована база даних телеметрії для BMS акумуляторів з можливістю пошуку, керування та видалення даних
            </p>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center space-x-2 self-start md:self-center">
          <button
            onClick={handleRefresh}
            disabled={isDeleting}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isDeleting ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Оновити дані</span>
          </button>
        </div>
      </div>

      {/* Sub Tab Bar */}
      <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setSubTab('fleet')}
          className={`flex-1 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all ${
            subTab === 'fleet'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Флотилія BMS ({devices.length})</span>
        </button>

        <button
          onClick={() => setSubTab('manage')}
          className={`flex-1 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all ${
            subTab === 'manage'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>Управління та Видалення Даних</span>
        </button>

        <button
          onClick={() => setSubTab('settings')}
          className={`flex-1 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all ${
            subTab === 'settings'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Налаштування & SQL Скрипти</span>
        </button>
      </div>

      {actionMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center space-x-2 ${
            actionMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {actionMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* SUB-TAB 1: Fleet Dashboard */}
      {subTab === 'fleet' && (
        isLocked ? (
          <PrivacyLockScreen onGoToSettings={() => setSubTab('settings')} />
        ) : (
          <FleetDashboard
            onSelectBms={(deviceName) => {
              if (onSelectBms) onSelectBms(deviceName);
            }}
          />
        )
      )}

      {/* SUB-TAB 2: Data Management & Delete */}
      {subTab === 'manage' && (
        isLocked ? (
          <PrivacyLockScreen onGoToSettings={() => setSubTab('settings')} />
        ) : (
          <div className="space-y-6">
            {/* Header notice */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">Управління Записами BMS у Supabase</h3>
                    <p className="text-xs text-slate-400">
                      Видалення телеметрії окремих BMS або повне очищення всієї таблиці '{config.tableName}'
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowClearAllModal(true)}
                  disabled={isDeleting || devices.length === 0}
                  className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-bold transition-all disabled:opacity-40 flex items-center space-x-2"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Очистити ВСЮ таблицю Supabase</span>
                </button>
              </div>

              {/* Device Filter */}
              <div className="flex items-center justify-between pt-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Пошук BMS за назвою..."
                    value={searchBms}
                    onChange={(e) => setSearchBms(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <span className="text-xs font-mono text-slate-400">
                  Знайдено BMS: <strong className="text-cyan-400">{filteredDevices.length}</strong>
                </span>
              </div>

              {/* List of BMS Devices with Delete Button */}
              <div className="space-y-3 pt-2">
                {filteredDevices.length === 0 ? (
                  <div className="text-center py-10 bg-slate-950/60 rounded-xl border border-slate-800 text-slate-500 text-xs">
                    Жодних BMS пристроїв не знайдено в таблиці '{config.tableName}'.
                  </div>
                ) : (
                  filteredDevices.map((dev) => (
                    <div
                      key={dev.device_name}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs hover:border-slate-700 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-slate-100 flex items-center space-x-2 text-sm">
                          <span>{dev.device_name}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              dev.isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {dev.isOnline ? '● Онлайн' : '○ Офлайн'}
                          </span>
                        </div>

                        <div className="text-slate-400 font-mono text-[11px] flex items-center space-x-4">
                          <span>Напруга: <strong className="text-slate-200">{dev.total_voltage.toFixed(1)} V</strong></span>
                          <span>Струм: <strong className="text-slate-200">{dev.current.toFixed(1)} A</strong></span>
                          <span>SOC: <strong className="text-emerald-400">{dev.soc}%</strong></span>
                          <span>Останнє оновлення: <strong className="text-slate-300">{dev.created_at ? new Date(dev.created_at).toLocaleString('uk-UA') : '—'}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => {
                            supabaseService.setActiveDeviceName(dev.device_name);
                            if (onSelectBms) onSelectBms(dev.device_name);
                          }}
                          className="px-3 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-semibold transition-all"
                        >
                          Обрати BMS
                        </button>

                        <button
                          onClick={() => setDeleteTargetDevice(dev.device_name)}
                          disabled={isDeleting}
                          className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-all disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Видалити цей BMS</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )
      )}

      {/* SUB-TAB 3: Settings & SQL */}
      {subTab === 'settings' && <SupabaseSyncSettings onChangeTab={onChangeTab} />}

      {/* Modal: Confirm Device Deletion */}
      {deleteTargetDevice && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-white">Підтвердження видалення BMS</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Ви дійсно бажаєте видалити <strong>усі записи телеметрії</strong> для BMS пристрою{' '}
              <strong className="text-cyan-400 font-mono">{deleteTargetDevice}</strong> з таблиці Supabase?
            </p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-amber-300 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Ця дія безповоротна і видалить усю збережену історію даного акумулятора.</span>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setDeleteTargetDevice(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Скасувати
              </button>
              <button
                onClick={() => handleDeleteDevice(deleteTargetDevice)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-rose-950"
              >
                {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Підтвердити видалення</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Clear All Telemetry */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 animate-pulse">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">УВАГА: Очищення всієї таблиці</h3>
                <p className="text-xs text-rose-300 font-mono">Таблиця: {config.tableName}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Ви збираєтесь <strong>повністю очистити та видалити всі записи телеметрії</strong> для УСІХ BMS пристроїв з базі даних Supabase.
            </p>

            <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl text-xs text-rose-300 font-semibold flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Дія безповоротна! Всі накопичені графіки та логи будуть видалені.</span>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowClearAllModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Скасувати
              </button>
              <button
                onClick={handleClearAll}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-rose-950"
              >
                {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Так, очистити ВСЮ таблицю</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
