import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { FleetDashboard } from './components/FleetDashboard';
import { SupabaseDashboard } from './components/SupabaseDashboard';
import { CellVoltages } from './components/CellVoltages';
import { LiveCharts } from './components/LiveCharts';
import { NotificationSettings } from './components/NotificationSettings';
import { ParameterSettings } from './components/ParameterSettings';
import { BmsInfoConsole } from './components/BmsInfoConsole';
import { Esp32FlashingConsole } from './components/Esp32FlashingConsole';
import { AboutAppPage } from './components/AboutAppPage';
import { BleConnectModal } from './components/BleConnectModal';
import { AlertToast } from './components/AlertToast';
import { bleManager } from './lib/bleManager';
import { langManager, translations } from './lib/i18n';
import { themeManager } from './lib/themeManager';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  useEffect(() => {
    const unsubBle = bleManager.subscribe(() => setTick((t) => t + 1));
    const unsubLang = langManager.subscribe(() => setTick((t) => t + 1));
    const unsubTheme = themeManager.subscribe(() => setTick((t) => t + 1));
    return () => {
      unsubBle();
      unsubLang();
      unsubTheme();
    };
  }, []);

  const bms = bleManager.bmsData;
  const isSim = bleManager.isSimulationMode;
  const connState = bleManager.connectionState;
  const lang = langManager.lang;
  const tFooter = translations[lang].footer;
  const isDark = themeManager.theme === 'dark';

  return (
    <div
      className={`min-h-screen font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-white relative transition-colors duration-200 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Sticky Header */}
      <Header
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'supabase' && (
          <SupabaseDashboard
            onSelectBms={() => {
              setActiveTab('dashboard');
            }}
            onChangeTab={(tab) => {
              setActiveTab(tab);
            }}
          />
        )}
        {activeTab === 'fleet' && (
          <FleetDashboard
            onSelectBms={() => {
              setActiveTab('dashboard');
            }}
          />
        )}
        {activeTab === 'cells' && <CellVoltages />}
        {activeTab === 'charts' && <LiveCharts />}
        {activeTab === 'notifications' && <NotificationSettings />}
        {activeTab === 'parameters' && <ParameterSettings />}
        {activeTab === 'flasher' && <Esp32FlashingConsole onChangeTab={setActiveTab} />}
        {activeTab === 'logs' && <BmsInfoConsole />}
        {activeTab === 'about' && <AboutAppPage />}
      </main>

      {/* Footer */}
      <footer
        className={`border-t py-4 text-xs mt-auto transition-colors ${
          isDark
            ? 'bg-slate-900/60 border-slate-800 text-slate-500'
            : 'bg-white border-slate-200 text-slate-600 shadow-inner'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span>{tFooter.version}</span>
            <span>•</span>
            <span className="font-mono text-cyan-500">
              {isSim ? tFooter.demo : connState === 'connected' ? tFooter.bleConnected : tFooter.disconnected}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <span>
              {tFooter.voltage}:{' '}
              <strong className={`font-mono ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                {bms.totalVoltage.toFixed(2)}V
              </strong>
            </span>
            <span>
              {tFooter.current}:{' '}
              <strong className={`font-mono ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                {bms.current.toFixed(1)}A
              </strong>
            </span>
            <span>
              {tFooter.delta}:{' '}
              <strong className={`font-mono ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                {bms.deltaVoltage}mV
              </strong>
            </span>
          </div>
        </div>
      </footer>

      {/* BLE Connect Modal */}
      <BleConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
      />

      {/* Global Alert Toast Popups */}
      <AlertToast />
    </div>
  );
}

