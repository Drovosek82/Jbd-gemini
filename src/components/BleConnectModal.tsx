import React, { useState } from 'react';
import { bleManager } from '../lib/bleManager';
import { Bluetooth, RefreshCw, AlertCircle, X, ShieldCheck, Cpu } from 'lucide-react';

interface BleConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BleConnectModal: React.FC<BleConnectModalProps> = ({ isOpen, onClose }) => {
  const [errorMsg, setErrorMsg] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  if (!isOpen) return null;

  const isWebBtSupported = bleManager.isWebBluetoothSupported();

  const handleConnectBle = async () => {
    setErrorMsg('');
    setIsConnecting(true);
    try {
      await bleManager.connectRealDevice();
      onClose();
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        setErrorMsg('Вибір пристрою було скасовано.');
      } else {
        setErrorMsg(err.message || 'Помилка підключення через Web Bluetooth.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSwitchToDemo = () => {
    bleManager.toggleSimulationMode(true);
    onClose();
  };

  const handleCancelReconnect = () => {
    bleManager.cancelAutoReconnect();
  };

  const isReconnecting = bleManager.connectionState === 'reconnecting';
  const autoReconnectEnabled = bleManager.autoReconnectEnabled;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 text-cyan-400">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Bluetooth className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">Підключення JBD Smart BMS</h3>
            <p className="text-xs text-slate-400">Виберіть спосіб підключення до акумулятора</p>
          </div>
        </div>

        {/* Reconnecting banner if active */}
        {isReconnecting && (
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 text-xs text-amber-300 space-y-2.5 animate-pulse">
            <div className="font-bold flex items-center justify-between text-amber-400">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-amber-400" />
                <span>Авто-перепідключення: {bleManager.lastConnectedDeviceName || 'BMS'}</span>
              </span>
              <span className="font-mono font-bold bg-amber-500/20 px-2 py-0.5 rounded text-[11px]">
                {bleManager.autoReconnectAttempts}/{bleManager.maxAutoReconnectAttempts}
              </span>
            </div>
            <p className="text-slate-300">
              Випадково втрачено зв'язок Bluetooth. Автоматичне фонове відновлення...
            </p>
            <button
              onClick={handleCancelReconnect}
              className="w-full py-1.5 px-3 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-800 text-xs font-semibold transition-colors"
            >
              Зупинити та скасувати перепідключення
            </button>
          </div>
        )}

        {/* Web Bluetooth status box */}
        {!isWebBtSupported ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-300 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Web Bluetooth недоступний у цьому вікні браузера</span>
            </div>
            <p className="text-slate-300">
              Браузерне BLE вимагає Google Chrome, MS Edge або Chrome Android. Увімкніть режим симуляції для тестування усіх функцій!
            </p>
          </div>
        ) : (
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 space-y-2">
            <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Сумісні пристрої BMS:</span>
            </div>
            <p className="text-slate-400">
              JBD-SP15S001, JBD-AP21S001, Xiaoxiang Smart BMS, Overkill Solar BMS, Liontron BLE та будь-які інші плати з BLE модулем JBD (префікс 'JBD', 'xiaoxiang', 'SP').
            </p>
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Auto reconnect toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <div className="space-y-0.5">
            <span className="font-semibold text-slate-200 block">Авто-перепідключення BLE</span>
            <span className="text-[11px] text-slate-400">Автоматично відновлювати зв'язок при розриві</span>
          </div>
          <button
            type="button"
            onClick={() => bleManager.setAutoReconnectEnabled(!autoReconnectEnabled)}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              autoReconnectEnabled ? 'bg-cyan-600' : 'bg-slate-800 border border-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                autoReconnectEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          {isWebBtSupported && (
            <button
              id="btn-scan-ble"
              onClick={handleConnectBle}
              disabled={isConnecting}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center space-x-2 shadow-lg shadow-cyan-900/40 transition-all disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Пошук та сканування BLE...</span>
                </>
              ) : (
                <>
                  <Bluetooth className="w-4 h-4" />
                  <span>Шукати JBD BMS по Bluetooth</span>
                </>
              )}
            </button>
          )}

          <button
            id="btn-switch-demo"
            onClick={handleSwitchToDemo}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center space-x-2 transition-all"
          >
            <Cpu className="w-4 h-4 text-amber-400" />
            <span>Запустити Демо / Симуляцію BMS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
