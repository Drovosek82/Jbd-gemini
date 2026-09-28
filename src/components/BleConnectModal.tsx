import React, { useState, useEffect } from 'react';
import { bleManager } from '../lib/bleManager';
import { supabaseService, SupabaseBmsRecord } from '../lib/supabaseService';
import { esp32WifiService, Esp32Device } from '../lib/esp32WifiService';
import {
  Bluetooth,
  Wifi,
  Cloud,
  Cpu,
  RefreshCw,
  AlertCircle,
  X,
  ShieldCheck,
  Search,
  CheckCircle2,
  Database,
  Radio,
  Copy,
  Check,
  Code2,
  DownloadCloud,
} from 'lucide-react';

interface BleConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BleConnectModal: React.FC<BleConnectModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'ble' | 'wifi' | 'supabase' | 'demo'>('ble');
  const [errorMsg, setErrorMsg] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Supabase search state
  const [supaSearch, setSupaSearch] = useState('');
  const [supaDevices, setSupaDevices] = useState<SupabaseBmsRecord[]>(supabaseService.devicesList);

  // ESP32 Wi-Fi state
  const [customIp, setCustomIp] = useState('192.168.4.1');
  const [wifiDevices, setWifiDevices] = useState<Esp32Device[]>(esp32WifiService.discoveredDevices);
  const [isScanningWifi, setIsScanningWifi] = useState(false);
  const [showEspWifiCode, setShowEspWifiCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [acceptAllBleDevices, setAcceptAllBleDevices] = useState(true);

  useEffect(() => {
    const unsubSupa = supabaseService.subscribe(() => {
      setSupaDevices([...supabaseService.devicesList]);
    });
    const unsubWifi = esp32WifiService.subscribe(() => {
      setWifiDevices([...esp32WifiService.discoveredDevices]);
    });
    return () => {
      unsubSupa();
      unsubWifi();
    };
  }, []);

  if (!isOpen) return null;

  const isWebBtSupported = bleManager.isWebBluetoothSupported();

  // Bluetooth Connect
  const handleConnectBle = async () => {
    setErrorMsg('');
    setIsConnecting(true);
    try {
      await bleManager.connectRealDevice(acceptAllBleDevices);
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

  // ESP32 Wi-Fi Scan & Connect
  const handleScanWifi = async () => {
    setIsScanningWifi(true);
    await esp32WifiService.scanWifiDevices();
    setIsScanningWifi(false);
  };

  const handleConnectWifiIp = async (ip: string) => {
    setErrorMsg('');
    setIsConnecting(true);
    const ok = await esp32WifiService.connectToEsp32(ip);
    setIsConnecting(false);
    if (ok) {
      onClose();
    } else {
      setErrorMsg(`Не вдалося з'єднатися з ESP32 Wi-Fi за адресою http://${ip}/api/data`);
    }
  };

  // Supabase Select BMS
  const handleSelectSupabaseDevice = (deviceName: string) => {
    supabaseService.setActiveDeviceName(deviceName);
    onClose();
  };

  // Demo mode
  const handleSwitchToDemo = () => {
    if (bleManager.isSimulationMode) {
      bleManager.toggleSimulationMode(false);
    } else {
      bleManager.toggleSimulationMode(true);
    }
    onClose();
  };

  const handleDisconnect = () => {
    bleManager.disconnectDevice();
    esp32WifiService.disconnect();
    onClose();
  };

  const filteredSupaDevices = supaDevices.filter((d) =>
    d.device_name.toLowerCase().includes(supaSearch.toLowerCase())
  );

  const isReconnecting = bleManager.connectionState === 'reconnecting';
  const autoReconnectEnabled = bleManager.autoReconnectEnabled;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 text-cyan-400">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">Центр Підключення JBD Smart BMS</h3>
            <p className="text-xs text-slate-400">Виберіть канал зв'язку з вашим акумулятором</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('ble')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
              activeTab === 'ble'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bluetooth className="w-3.5 h-3.5" />
            <span>Bluetooth (BLE)</span>
          </button>

          <button
            onClick={() => setActiveTab('wifi')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
              activeTab === 'wifi'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>ESP32 Wi-Fi</span>
          </button>

          <button
            onClick={() => setActiveTab('supabase')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
              activeTab === 'supabase'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Supabase Cloud</span>
          </button>

          <button
            onClick={() => setActiveTab('demo')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
              activeTab === 'demo'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Симуляція</span>
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TAB 1: Bluetooth BLE */}
        {activeTab === 'ble' && (
          <div className="space-y-4 overflow-y-auto pr-1">
            {isReconnecting && (
              <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 text-xs text-amber-300 space-y-2 animate-pulse">
                <div className="font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-amber-400" />
                    <span>Авто-перепідключення BLE...</span>
                  </span>
                </div>
              </div>
            )}

            {!isWebBtSupported ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Web Bluetooth недоступний у цьому вікні</span>
                </div>
                <p className="text-slate-300">
                  Використовуйте вкладку <strong>ESP32 Wi-Fi</strong> або <strong>Supabase Cloud</strong> для підключення до плати.
                </p>
              </div>
            ) : (
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 space-y-1.5">
                <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Сумісні пристрої BLE:</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  JBD-SP15S001, JBD-AP21S001, Xiaoxiang Smart BMS, Overkill Solar BMS, Liontron BLE та адаптери з модулями JBD BLE.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div className="space-y-0.5 pr-2">
                <span className="font-semibold text-slate-200 block">Показувати всі Bluetooth пристрої</span>
                <span className="text-[11px] text-slate-400 block">
                  {acceptAllBleDevices
                    ? 'Без фільтрації за назвою (відображає будь-який BLE пристрій)'
                    : 'Тільки пристрої з назвами JBD, ESP32, BMS, Xiaoxiang тощо'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAcceptAllBleDevices(!acceptAllBleDevices)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                  acceptAllBleDevices ? 'bg-cyan-600' : 'bg-slate-800 border border-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    acceptAllBleDevices ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <span className="font-semibold text-slate-200">Авто-перепідключення BLE</span>
              <button
                type="button"
                onClick={() => bleManager.setAutoReconnectEnabled(!autoReconnectEnabled)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
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
                    <span>Сканування пристроїв BLE...</span>
                  </>
                ) : (
                  <>
                    <Bluetooth className="w-4 h-4" />
                    <span>Шукати JBD BMS по Bluetooth</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* TAB 2: ESP32 Wi-Fi Scanning & Direct IP */}
        {activeTab === 'wifi' && (
          <div className="space-y-4 overflow-y-auto pr-1">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                  <Wifi className="w-4 h-4 text-cyan-400" />
                  <span>Сканування мереж ESP32:</span>
                </span>
                <button
                  onClick={handleScanWifi}
                  disabled={isScanningWifi}
                  className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-[11px] font-bold flex items-center space-x-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isScanningWifi ? 'animate-spin' : ''}`} />
                  <span>Сканувати локальну мережу</span>
                </button>
              </div>

              {/* Wifi Discovered Devices List */}
              <div className="space-y-2">
                {wifiDevices.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-200">Пристроїв ESP32 Wi-Fi не виявлено</p>
                    <p className="text-[11px] text-slate-400">
                      Натисніть <strong className="text-cyan-400">"Сканувати локальну мережу"</strong> або введіть IP-адресу вашого ESP32 вручну нижче (наприклад, <code className="text-cyan-400 font-mono">192.168.4.1</code> для точки доступу або <code className="text-cyan-400 font-mono">192.168.1.150</code>).
                    </p>
                  </div>
                ) : (
                  wifiDevices.map((dev) => (
                    <div
                      key={dev.ip}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-100 flex items-center space-x-2">
                          <span>{dev.name}</span>
                          <span className="text-[10px] font-mono text-cyan-400 px-1.5 py-0.5 bg-cyan-950 rounded">
                            {dev.ip}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center space-x-2 font-mono">
                          <span>SSID: {dev.ssid}</span>
                          <span>•</span>
                          <span>Signal: {dev.rssi} dBm</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleConnectWifiIp(dev.ip)}
                        disabled={isConnecting}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all"
                      >
                        Підключити
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Custom IP Input */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                Пряме підключення за IP адресою ESP32:
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={customIp}
                  onChange={(e) => setCustomIp(e.target.value)}
                  placeholder="192.168.4.1 або 192.168.1.150"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={() => handleConnectWifiIp(customIp)}
                  disabled={isConnecting || !customIp}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold"
                >
                  З'єднатися
                </button>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowEspWifiCode(!showEspWifiCode)}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center space-x-1"
              >
                <Code2 className="w-4 h-4" />
                <span>Переглянути C++ код для ESP32 Wi-Fi AP & WebServer</span>
              </button>
            </div>

            {showEspWifiCode && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                  <span>ESP32 WebServer Code (/api/data)</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(esp32WifiService.getEsp32WebserverCode());
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="text-cyan-400 hover:text-cyan-300 text-[11px] flex items-center space-x-1"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Скопійовано' : 'Копіювати'}</span>
                  </button>
                </div>
                <pre className="text-[10px] font-mono text-emerald-300 max-h-40 overflow-y-auto">
                  {esp32WifiService.getEsp32WebserverCode()}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Supabase Cloud BMS Search */}
        {activeTab === 'supabase' && (
          <div className="space-y-4 overflow-y-auto pr-1">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span>Пошук BMS у базі даних Supabase:</span>
                </label>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">
                  {supaDevices.length} BMS знайдено
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Введіть назву BMS (напр. JBD-SP14S004)..."
                  value={supaSearch}
                  onChange={(e) => setSupaSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* BMS Devices Grid */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {filteredSupaDevices.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs space-y-1">
                  <div>Жодного пристрою BMS не знайдено за вашим запитом.</div>
                  <p className="text-[11px] text-slate-400">
                    Перевірте вкладку "Сповіщення та Пороги", де налаштовано URL та ключ таблиці Supabase.
                  </p>
                </div>
              ) : (
                filteredSupaDevices.map((dev) => (
                  <div
                    key={dev.device_name}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 flex items-center justify-between text-xs transition-all cursor-pointer group"
                    onClick={() => handleSelectSupabaseDevice(dev.device_name)}
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-slate-100 group-hover:text-cyan-300 flex items-center space-x-2">
                        <span>{dev.device_name}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                            dev.isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {dev.isOnline ? '● Онлайн' : '○ Офлайн'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono space-x-3">
                        <span>V: <strong className="text-slate-200">{dev.total_voltage.toFixed(1)}V</strong></span>
                        <span>A: <strong className="text-slate-200">{dev.current.toFixed(1)}A</strong></span>
                        <span>SOC: <strong className="text-emerald-400">{dev.soc}%</strong></span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectSupabaseDevice(dev.device_name);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-bold transition-all"
                    >
                      Підключити
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: Simulation */}
        {activeTab === 'demo' && (
          <div className="space-y-4 overflow-y-auto pr-1">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-300 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-amber-400">
                <Cpu className="w-4 h-4 shrink-0" />
                <span>Демо-симуляція JBD SP14S004:</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Генерує віртуальний акумулятор Литій-Залізо-Фосфат (LiFePO4) 14S з динамічним струмом зарядки/розрядки, дисбалансом комірок, температурою та сповіщеннями.
              </p>
            </div>

            {bleManager.isSimulationMode ? (
              <button
                id="btn-switch-demo"
                onClick={handleSwitchToDemo}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center justify-center space-x-2 transition-all"
              >
                <Cpu className="w-4 h-4 text-amber-400" />
                <span>Вимкнути Демо-режим (Зупинити симуляцію)</span>
              </button>
            ) : (
              <button
                id="btn-switch-demo"
                onClick={handleSwitchToDemo}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center space-x-2 transition-all"
              >
                <Cpu className="w-4 h-4 text-amber-400" />
                <span>Увімкнути Демо / Симуляцію BMS</span>
              </button>
            )}
          </div>
        )}

        {/* Global Disconnect if connected */}
        {(bleManager.connectionState === 'connected' || esp32WifiService.status.state === 'connected') && (
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={handleDisconnect}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center space-x-2 transition-all"
            >
              <span>Відключити поточний пристрій (Bluetooth / ESP32 Wi-Fi)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
