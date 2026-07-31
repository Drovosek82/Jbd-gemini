import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { CellVoltages } from './components/CellVoltages';
import { LiveCharts } from './components/LiveCharts';
import { NotificationSettings } from './components/NotificationSettings';
import { ParameterSettings } from './components/ParameterSettings';
import { BmsInfoConsole } from './components/BmsInfoConsole';
import { BleConnectModal } from './components/BleConnectModal';
import { AlertToast } from './components/AlertToast';
import { bleManager } from './lib/bleManager';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    return bleManager.subscribe(() => setTick((t) => t + 1));
  }, []);

  const bms = bleManager.bmsData;
  const isSim = bleManager.isSimulationMode;
  const connState = bleManager.connectionState;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-white relative">
      {/* Sticky Header */}
      <Header
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'cells' && <CellVoltages />}
        {activeTab === 'charts' && <LiveCharts />}
        {activeTab === 'notifications' && <NotificationSettings />}
        {activeTab === 'parameters' && <ParameterSettings />}
        {activeTab === 'logs' && <BmsInfoConsole />}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900/60 border-t border-slate-800 py-4 text-slate-500 text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span>JBD Smart BMS BLE Manager v1.0</span>
            <span>•</span>
            <span className="font-mono text-cyan-400">
              {isSim ? 'Демо-режим' : connState === 'connected' ? "BLE З'єднано" : 'Непідключено'}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <span>
              Вольтаж: <strong className="text-slate-300 font-mono">{bms.totalVoltage.toFixed(2)}V</strong>
            </span>
            <span>
              Струм: <strong className="text-slate-300 font-mono">{bms.current.toFixed(1)}A</strong>
            </span>
            <span>
              ΔV: <strong className="text-slate-300 font-mono">{bms.deltaVoltage}mV</strong>
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
