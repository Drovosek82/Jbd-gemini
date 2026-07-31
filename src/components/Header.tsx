import React, { useState, useEffect } from 'react';
import { bleManager } from '../lib/bleManager';
import { Bluetooth, BluetoothConnected, BluetoothOff, Cpu, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onOpenConnectModal: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenConnectModal, activeTab, setActiveTab }) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    return bleManager.subscribe(() => setTick((t) => t + 1));
  }, []);

  const connState = bleManager.connectionState;
  const isSim = bleManager.isSimulationMode;
  const bms = bleManager.bmsData;

  // Protection alarms check
  const activeAlarms = Object.values(bms.protection || {}).filter(Boolean).length;

  // Unread notifications count
  const unreadAlerts = bleManager.notifications.filter((n) => !n.isRead).length;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-lg leading-none tracking-tight text-white">JBD Smart BMS</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-cyan-400 font-mono font-medium border border-cyan-500/30">
                  {bms.hardwareName || 'BLE Monitor'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Bluetooth Моніторинг та Налаштування</p>
            </div>
          </div>

          {/* Right Status & Actions */}
          <div className="flex items-center space-x-3">
            {/* Alarm Badge */}
            {activeAlarms > 0 ? (
              <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Захист ({activeAlarms})</span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>BMS в нормі</span>
              </div>
            )}

            {/* Mode Tag */}
            {isSim ? (
              <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                ⚡ Демо / Симуляція
              </span>
            ) : (
              <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                📶 BLE Пристрій
              </span>
            )}

            {/* Connection Button */}
            <button
              id="btn-ble-connect"
              onClick={onOpenConnectModal}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-medium text-xs transition-all shadow-sm ${
                connState === 'connected'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
                  : connState === 'reconnecting'
                  ? 'bg-amber-600/90 hover:bg-amber-600 text-white animate-pulse border border-amber-400/40 shadow-amber-900/40'
                  : connState === 'connecting'
                  ? 'bg-amber-600 text-white animate-pulse'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/40'
              }`}
            >
              {connState === 'connected' ? (
                <>
                  <BluetoothConnected className="w-4 h-4 text-white" />
                  <span className="hidden sm:inline">Підключено</span>
                </>
              ) : connState === 'reconnecting' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-200" />
                  <span>Перепідключення ({bleManager.autoReconnectAttempts}/{bleManager.maxAutoReconnectAttempts})</span>
                </>
              ) : connState === 'connecting' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>З'єднання...</span>
                </>
              ) : (
                <>
                  <Bluetooth className="w-4 h-4 text-white" />
                  <span>Підключити BLE</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 border-t border-slate-800/80 pt-2 pb-1 overflow-x-auto scrollbar-none">
          {[
            { id: 'dashboard', label: 'Головна Панель' },
            { id: 'cells', label: 'Осередки (Cells)' },
            { id: 'charts', label: 'Графіки & Історія' },
            { id: 'notifications', label: 'Сповіщення та Пороги', badge: unreadAlerts },
            { id: 'parameters', label: 'Налаштування BMS' },
            { id: 'logs', label: 'Діагностика & BLE' },
          ].map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center space-x-1.5 ${
                activeTab === tab.id
                  ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge ? (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
