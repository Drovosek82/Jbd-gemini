import React, { useState, useEffect } from 'react';
import { bleManager } from '../lib/bleManager';
import { supabaseService } from '../lib/supabaseService';
import { langManager, translations } from '../lib/i18n';
import { themeManager } from '../lib/themeManager';
import {
  Bluetooth,
  BluetoothConnected,
  BluetoothOff,
  Cpu,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Cloud,
  CloudOff,
  User,
  LogOut,
  LogIn,
  Sun,
  Moon,
  Globe,
  Info,
} from 'lucide-react';

interface HeaderProps {
  onOpenConnectModal: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenConnectModal, activeTab, setActiveTab }) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubBle = bleManager.subscribe(() => setTick((t) => t + 1));
    const unsubSupa = supabaseService.subscribe(() => setTick((t) => t + 1));
    const unsubLang = langManager.subscribe(() => setTick((t) => t + 1));
    const unsubTheme = themeManager.subscribe(() => setTick((t) => t + 1));
    return () => {
      unsubBle();
      unsubSupa();
      unsubLang();
      unsubTheme();
    };
  }, []);

  const connState = bleManager.connectionState;
  const isSim = bleManager.isSimulationMode;
  const bms = bleManager.bmsData;
  const supaConfig = supabaseService.config;
  const supaStatus = supabaseService.status;
  const lang = langManager.lang;
  const t = translations[lang];
  const isDark = themeManager.theme === 'dark';

  // Protection alarms check
  const activeAlarms = Object.values(bms.protection || {}).filter(Boolean).length;

  // Unread notifications count
  const unreadAlerts = bleManager.notifications.filter((n) => !n.isRead).length;

  const tabItems = [
    { id: 'dashboard', label: t.tabs.dashboard },
    { id: 'supabase', label: t.tabs.supabase },
    { id: 'fleet', label: t.tabs.fleet },
    { id: 'cells', label: t.tabs.cells },
    { id: 'charts', label: t.tabs.charts },
    { id: 'notifications', label: t.tabs.notifications, badge: unreadAlerts },
    { id: 'parameters', label: t.tabs.parameters },
    { id: 'flasher', label: t.tabs.flasher },
    { id: 'logs', label: t.tabs.logs },
    { id: 'about', label: t.tabs.about },
  ];

  return (
    <header className={`sticky top-0 z-40 backdrop-blur border-b transition-colors ${
      isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-white/90 border-slate-200 text-slate-900 shadow-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & Name */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 shrink-0">
              <Cpu className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <h1 className={`font-bold text-sm sm:text-base md:text-lg leading-none tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {t.appName}
                </h1>
                <span className={`text-[10px] sm:text-xs px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full font-mono font-medium border truncate max-w-[70px] sm:max-w-none ${
                  isDark ? 'bg-slate-800 text-cyan-400 border-cyan-500/30' : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                }`}>
                  {bms.hardwareName || 'BMS'}
                </span>
              </div>
              <p className={`text-[10px] sm:text-xs mt-0.5 truncate hidden xs:block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.appSub}</p>
            </div>
          </div>

          {/* Right Status & Actions */}
          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3 shrink-0">
            {/* Alarm Badge */}
            {activeAlarms > 0 ? (
              <div className="flex items-center space-x-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] sm:text-xs font-semibold animate-pulse">
                <AlertTriangle className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                <span className="hidden sm:inline">{t.protectionActive} ({activeAlarms})</span>
                <span className="sm:hidden">{activeAlarms}</span>
              </div>
            ) : (
              <div className={`hidden md:flex items-center space-x-1 px-2.5 py-1 rounded-full border text-xs font-medium ${
                isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{t.bmsOk}</span>
              </div>
            )}

            {/* Supabase Sync Tag / Secure Notice */}
            <button
              onClick={() => setActiveTab('supabase')}
              title="Налаштування приватної хмари"
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                (!supabaseService.authUser)
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/40 hover:bg-amber-500/20 animate-pulse'
                  : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20'
              }`}
            >
              <Cloud className="w-3.5 h-3.5 shrink-0" />
              <span>
                {(!supabaseService.authUser)
                  ? 'Увійти / Телеметрія 🔒'
                  : `Хмара (${supaStatus.deviceCount})`}
              </span>
            </button>

            {/* Language Selector */}
            <button
              onClick={() => langManager.toggleLanguage()}
              title={t.theme.language}
              className={`p-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-bold border flex items-center space-x-1 transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-cyan-500" />
              <span className="hidden sm:inline">{lang === 'uk' ? 'UA' : 'EN'}</span>
            </button>

            {/* Light / Dark Theme Toggle */}
            <button
              onClick={() => themeManager.toggleTheme()}
              title={t.theme.toggleTheme}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-cyan-600" />}
            </button>

            {/* Connection Button */}
            <button
              id="btn-ble-connect"
              onClick={onOpenConnectModal}
              className={`flex items-center space-x-1 sm:space-x-2 px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-lg font-medium text-xs transition-all shadow-sm ${
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
                  <BluetoothConnected className="w-4 h-4 text-white shrink-0" />
                  <span className="hidden sm:inline">{t.connected}</span>
                </>
              ) : connState === 'reconnecting' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-200 shrink-0" />
                  <span className="hidden md:inline">{t.reconnecting}</span>
                </>
              ) : connState === 'connecting' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white shrink-0" />
                  <span className="hidden sm:inline">{t.connecting}</span>
                </>
              ) : (
                <>
                  <Bluetooth className="w-4 h-4 text-white shrink-0" />
                  <span className="hidden sm:inline">{t.connectBle}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        {/* Desktop Navigation (visible on md and up) */}
        <div className={`hidden md:flex space-x-1 border-t pt-2 pb-1 overflow-x-auto scrollbar-none ${
          isDark ? 'border-slate-800/80' : 'border-slate-200'
        }`}>
          {tabItems.map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
                activeTab === tab.id
                  ? isDark
                    ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 font-semibold'
                    : 'bg-cyan-50 text-cyan-700 border border-cyan-300 font-semibold shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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

        {/* Mobile Navigation (visible on screens below md) */}
        <div className={`flex md:hidden flex-wrap items-center justify-between border-t pt-2 pb-1 gap-1.5 ${
          isDark ? 'border-slate-800/80' : 'border-slate-200'
        }`}>
          {/* Quick primary tabs */}
          <div className="flex flex-1 space-x-1 min-w-0">
            {[
              { id: 'dashboard', label: 'Головна' },
              { id: 'cells', label: 'Осередки' },
              { id: 'flasher', label: 'Прошивка' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg text-center truncate cursor-pointer transition-colors ${
                  activeTab === tab.id
                    ? isDark
                      ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-cyan-50 text-cyan-700 border border-cyan-300 shadow-xs'
                    : isDark
                    ? 'bg-slate-900 border border-slate-800/50 text-slate-400 hover:text-slate-200'
                    : 'bg-slate-100/80 border border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Dropdown for other tabs */}
          <div className="relative w-28 shrink-0">
            <select
              value={['dashboard', 'cells', 'flasher'].includes(activeTab) ? '' : activeTab}
              onChange={(e) => {
                if (e.target.value) {
                  setActiveTab(e.target.value);
                }
              }}
              className={`w-full py-1.5 pl-2 pr-5 text-[11px] font-bold rounded-lg border appearance-none cursor-pointer focus:outline-none transition-colors ${
                !['dashboard', 'cells', 'flasher'].includes(activeTab)
                  ? isDark
                    ? 'bg-cyan-600/20 border-cyan-500/30 text-cyan-400'
                    : 'bg-cyan-50 border-cyan-300 text-cyan-700 shadow-xs'
                  : isDark
                  ? 'bg-slate-900 border-slate-800/50 text-slate-400 hover:text-slate-200'
                  : 'bg-slate-100/80 border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
              style={{
                backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='${
                  !['dashboard', 'cells', 'flasher'].includes(activeTab)
                    ? (isDark ? '%2322d3ee' : '%230369a1')
                    : '%2394a3b8'
                }' stroke-linecap='round' stroke-linejoin='round' stroke-width='2.5'><path d='m3 4.5 3 3 3-3'/></svg>")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 6px center',
                backgroundSize: '10px'
              }}
            >
              <option value="" disabled className={isDark ? 'bg-slate-950 text-slate-400' : 'bg-white text-slate-500'}>
                { !['dashboard', 'cells', 'flasher'].includes(activeTab)
                  ? tabItems.find(t => t.id === activeTab)?.label || 'Інші...'
                  : 'Інші...'
                }
              </option>
              {tabItems
                .filter((t) => !['dashboard', 'cells', 'flasher'].includes(t.id))
                .map((tab) => (
                  <option key={tab.id} value={tab.id} className={isDark ? 'bg-slate-950 text-slate-200' : 'bg-white text-slate-800'}>
                    {tab.label} {tab.badge ? ` (${tab.badge})` : ''}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};

