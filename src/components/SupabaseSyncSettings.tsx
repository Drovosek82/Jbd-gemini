import React, { useState, useEffect, useRef } from 'react';
import { supabaseService, SupabaseSyncConfig, SupabaseSyncStatus, SupabaseBmsRecord } from '../lib/supabaseService';
import { langManager, translations } from '../lib/i18n';
import { themeManager } from '../lib/themeManager';
import {
  Cloud,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Code2,
  Copy,
  Check,
  Radio,
  Clock,
  Database,
  Play,
  Cpu,
  Server,
  DownloadCloud,
  Search,
  RotateCcw,
  Key,
  X,
  UserPlus,
  LogIn,
  Mail,
  Lock,
  User,
  ShieldCheck,
  UserCheck,
  Wrench,
  HelpCircle,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';

interface SupabaseSyncSettingsProps {
  onChangeTab?: (tab: string) => void;
}

export const SupabaseSyncSettings: React.FC<SupabaseSyncSettingsProps> = ({ onChangeTab }) => {
  const [config, setConfig] = useState<SupabaseSyncConfig>(supabaseService.config);
  const [status, setStatus] = useState<SupabaseSyncStatus>(supabaseService.status);
  const [devices, setDevices] = useState<SupabaseBmsRecord[]>(supabaseService.devicesList);
  const [searchBms, setSearchBms] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [showEspModal, setShowEspModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedEsp, setCopiedEsp] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [, setTick] = useState(0);

  // Local unsaved states for inputs
  const [localUrl, setLocalUrl] = useState(supabaseService.config.supabaseUrl || '');
  const [localKey, setLocalKey] = useState(supabaseService.config.supabaseKey || '');
  const [localTableName, setLocalTableName] = useState(supabaseService.config.tableName || '');

  // Synchronize draft changes with service config on unmount to prevent losing data when switching tabs directly
  const draftsRef = useRef({ url: localUrl, key: localKey, tableName: localTableName });
  useEffect(() => {
    draftsRef.current = { url: localUrl, key: localKey, tableName: localTableName };
  }, [localUrl, localKey, localTableName]);

  useEffect(() => {
    return () => {
      const { url, key, tableName } = draftsRef.current;
      supabaseService.saveConfig({
        supabaseUrl: url,
        supabaseKey: key,
        tableName: tableName
      });
    };
  }, []);

  // Auth Form State
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authResponse, setAuthResponse] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    setLocalUrl(config.supabaseUrl || '');
    setLocalKey(config.supabaseKey || '');
    setLocalTableName(config.tableName || '');
  }, [config.supabaseUrl, config.supabaseKey, config.tableName]);

  const handleSaveAll = () => {
    supabaseService.saveConfig({
      supabaseUrl: localUrl,
      supabaseKey: localKey,
      tableName: localTableName
    });
    if (onChangeTab) {
      onChangeTab('flasher');
    }
  };

  useEffect(() => {
    const unsubBle = supabaseService.subscribe(() => {
      setConfig({ ...supabaseService.config });
      setStatus({ ...supabaseService.status });
      setDevices([...supabaseService.devicesList]);
    });
    const unsubLang = langManager.subscribe(() => setTick((t) => t + 1));
    const unsubTheme = themeManager.subscribe(() => setTick((t) => t + 1));
    return () => {
      unsubBle();
      unsubLang();
      unsubTheme();
    };
  }, []);

  const lang = langManager.lang;
  const tModes = translations[lang].supabaseModes;
  const isDark = themeManager.theme === 'dark';

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthResponse(null);
    if (!authEmail || !authPassword) {
      setAuthResponse({ success: false, message: 'Будь ласка, введіть Email та пароль' });
      return;
    }
    const res = await supabaseService.signUpWithEmail(authEmail, authPassword, authName);
    setAuthResponse(res);
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthResponse(null);
    if (!authEmail || !authPassword) {
      setAuthResponse({ success: false, message: 'Будь ласка, введіть Email та пароль' });
      return;
    }
    const res = await supabaseService.signInWithEmail(authEmail, authPassword);
    setAuthResponse(res);
  };

  const handleToggleSync = (enabled: boolean) => {
    supabaseService.setEnabled(enabled);
  };

  const handleSaveField = (key: keyof SupabaseSyncConfig, value: any) => {
    supabaseService.saveConfig({ [key]: value });
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await supabaseService.testConnection();
    setTestResult(res);
    setIsTesting(false);
  };

  const handleManualFetch = async () => {
    setIsTesting(true);
    await supabaseService.fetchAllDevicesTelemetry();
    setIsTesting(false);
  };

  const sqlCode = supabaseService.getTableSqlSchema();
  const espCode = supabaseService.getEsp32CodeSnippet();

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleCopyEsp = () => {
    navigator.clipboard.writeText(espCode);
    setCopiedEsp(true);
    setTimeout(() => setCopiedEsp(false), 2000);
  };

  return (
    <div
      className={`rounded-2xl p-6 shadow-xl space-y-6 transition-colors ${
        isDark ? 'bg-slate-900/90 border border-slate-800' : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
      }`}
    >
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-xl ${
            config.enabled
              ? isDark ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-cyan-50 text-cyan-600 border border-cyan-200'
              : isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'
          }`}>
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className={`text-base font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                Supabase Cloud Моніторинг
              </h3>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                config.enabled
                  ? isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : isDark ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}>
                <DownloadCloud className="w-3 h-3" /> {config.enabled ? 'Отримання телеметрії' : 'Вимкнено'}
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Централізована хмарна платформа моніторингу телеметрії BMS акумуляторів з підтримкою ESP32 шлюзу
            </p>
          </div>
        </div>

        {/* Master Toggle */}
        <div className="flex items-center space-x-3 self-start sm:self-center">
          <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {config.enabled ? 'Синхронізація Увімкнена' : 'Вимкнено'}
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => handleToggleSync(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500 shadow-inner"></div>
          </label>
        </div>
      </div>

      {/* Super simple friendly guide */}
      <div className={`p-4 rounded-2xl border text-xs sm:text-sm space-y-3 ${
        isDark ? 'bg-gradient-to-r from-cyan-950/40 to-slate-900 border-cyan-800/40 text-cyan-100' : 'bg-gradient-to-r from-cyan-50 to-sky-50 border-cyan-200 text-cyan-950'
      }`}>
        <div className="flex items-center space-x-2 font-bold text-sm">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>👶 Як це працює за 3 простих кроки (дуже легко!):</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-cyan-100 shadow-sm'}`}>
            <div className="font-bold text-cyan-400 mb-1">1️⃣ Увійдіть в акаунт</div>
            <p className="text-xs opacity-85 leading-relaxed">
              Введіть свій Email і пароль (або створіть новий акаунт) у формі нижче. Це створить ваше особисте сховище.
            </p>
          </div>
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-cyan-100 shadow-sm'}`}>
            <div className="font-bold text-cyan-400 mb-1">2️⃣ Візьміть свій Client ID</div>
            <p className="text-xs opacity-85 leading-relaxed">
              Після входу у вас з'явиться ваш унікальний код (Client ID). Натисніть кнопку «Копіювати ID».
            </p>
          </div>
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-cyan-100 shadow-sm'}`}>
            <div className="font-bold text-cyan-400 mb-1">3️⃣ Підключіть ESP32</div>
            <p className="text-xs opacity-85 leading-relaxed">
              Вставте цей ID у налаштуваннях вашої плати ESP32 на вкладці «Хмара», і батарея почне передавати дані сюди!
            </p>
          </div>
        </div>
      </div>

      {/* Demo DB Warning Banner */}
      {supabaseService.isUsingDefaultDb() && (
        <div className={`p-4 rounded-2xl border flex items-start space-x-3 ${
          isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <Info className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
          <div className="space-y-1 text-xs leading-relaxed">
            <p className="font-bold">⚠️ Увага: Використовується публічна тестова база даних</p>
            <p>
              Ця загальна тестова база призначена <b>виключно для ознайомлення</b> та перевірки роботи програми. Усі дані на ній є спільними для всіх користувачів. 
              Для безпечного та особистого моніторингу ваших акумуляторів настійно рекомендуємо створити власну базу Supabase (скористайтесь кнопкою <b>«SQL Експерт»</b> нижче) та перейти у режим <b>«Експерт»</b>.
            </p>
          </div>
        </div>
      )}

      {/* USER MODE SWITCHER BAR: Standard User vs. Expert */}
      <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-inner'
      }`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div className="flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-cyan-500" />
            <span className={`text-xs font-bold uppercase tracking-wide ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              {tModes.title}
            </span>
          </div>
          <span className={`text-[11px] font-bold px-3 py-1 rounded-full font-mono border self-start sm:self-auto ${
            config.userMode === 'standard'
              ? isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              : isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-amber-100 text-amber-800 border-amber-300'
          }`}>
            {config.userMode === 'standard' ? `🟢 ${tModes.badgeStandard}` : `⚡ ${tModes.badgeExpert}`}
          </span>
        </div>

        {/* Mode Selector Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Standard Mode Card */}
          <button
            type="button"
            onClick={() => supabaseService.setUserMode('standard')}
            className={`p-4 rounded-xl border text-left transition-all relative cursor-pointer ${
              config.userMode === 'standard'
                ? isDark
                  ? 'bg-gradient-to-br from-cyan-950/60 to-slate-900 border-cyan-500/60 shadow-lg shadow-cyan-950/40 text-white'
                  : 'bg-gradient-to-br from-cyan-50 to-white border-cyan-500 shadow-md text-slate-900 ring-2 ring-cyan-500/30'
                : isDark
                ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100 text-slate-300'
                : 'bg-white border-slate-200 hover:border-slate-300 opacity-75 hover:opacity-100 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                  <User className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs">{tModes.modeStandard}</span>
              </div>
              {config.userMode === 'standard' && (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              )}
            </div>
            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {tModes.standardDesc}
            </p>
          </button>

          {/* Expert Mode Card */}
          <button
            type="button"
            onClick={() => supabaseService.setUserMode('expert')}
            className={`p-4 rounded-xl border text-left transition-all relative cursor-pointer ${
              config.userMode === 'expert'
                ? isDark
                  ? 'bg-gradient-to-br from-amber-950/50 to-slate-900 border-amber-500/60 shadow-lg shadow-amber-950/30 text-white'
                  : 'bg-gradient-to-br from-amber-50 to-white border-amber-500 shadow-md text-slate-900 ring-2 ring-amber-500/30'
                : isDark
                ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100 text-slate-300'
                : 'bg-white border-slate-200 hover:border-slate-300 opacity-75 hover:opacity-100 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                  <Wrench className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs">{tModes.modeExpert}</span>
              </div>
              {config.userMode === 'expert' && (
                <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" />
              )}
            </div>
            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {tModes.expertDesc}
            </p>
          </button>
        </div>
      </div>

      {/* EXPERT STEP-BY-STEP GUIDE BANNER (Rendered when Expert Mode is active) */}
      {config.userMode === 'expert' && (
        <div className={`p-5 rounded-2xl border space-y-4 transition-all ${
          isDark ? 'bg-amber-950/20 border-amber-500/40 text-amber-100' : 'bg-amber-50/80 border-amber-300 text-amber-950 shadow-sm'
        }`}>
          <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
            <div className="flex items-center space-x-2.5 font-bold text-xs">
              <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
              <span className="text-sm">{tModes.expertGuideTitle}</span>
            </div>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center space-x-1 shadow transition-all"
            >
              <span>Supabase Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Step 1 */}
            <div className={`p-3.5 rounded-xl border space-y-1 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-amber-200'
            }`}>
              <div className="font-bold flex items-center text-amber-500 space-x-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[11px] font-mono">1</span>
                <span>{tModes.step1Title}</span>
              </div>
              <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {tModes.step1Body}
              </p>
            </div>

            {/* Step 2 */}
            <div className={`p-3.5 rounded-xl border space-y-1 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-amber-200'
            }`}>
              <div className="font-bold flex items-center text-amber-500 space-x-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[11px] font-mono">2</span>
                <span>{tModes.step2Title}</span>
              </div>
              <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {tModes.step2Body}
              </p>
            </div>

            {/* Step 3 */}
            <div className={`p-3.5 rounded-xl border space-y-2 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-amber-200'
            }`}>
              <div className="font-bold flex items-center justify-between text-amber-500">
                <div className="flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[11px] font-mono">3</span>
                  <span>{tModes.step3Title}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 font-semibold flex items-center space-x-1 border border-amber-500/30"
                >
                  {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSql ? 'Скопійовано!' : 'Копіювати SQL'}</span>
                </button>
              </div>
              <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {tModes.step3Body}
              </p>
            </div>

            {/* Step 4 & 5 */}
            <div className={`p-3.5 rounded-xl border space-y-1 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-amber-200'
            }`}>
              <div className="font-bold flex items-center text-amber-500 space-x-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[11px] font-mono">4 & 5</span>
                <span>{tModes.step4Title}</span>
              </div>
              <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {tModes.step4Body} {tModes.step5Body}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info Notice about Read-Only Architecture */}
      <div className={`border rounded-xl p-3.5 text-xs flex items-start space-x-3 ${
        isDark ? 'bg-cyan-950/40 border-cyan-800/40 text-cyan-200' : 'bg-cyan-50 border-cyan-200 text-cyan-900'
      }`}>
        <Cpu className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold">Архітектура роботи з ESP32 & Supabase:</div>
          <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            Веб-програма працює як клієнт для ЧИТАННЯ та МОНІТОРИНГУ. Плата ESP32 зчитує дані з портів JBD BMS (UART/BLE) та безперервно відправляє їх у базу Supabase.
          </p>
        </div>
      </div>

      {/* Sync Status Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`border rounded-xl p-3 flex items-center space-x-3 ${
          isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-sm'
        }`}>
          <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <Clock className="w-4 h-4 text-cyan-500" />
          </div>
          <div>
            <div className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Останнє оновлення</div>
            <div className={`text-xs font-bold font-mono ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {status.lastSyncTime || 'Очікування даних...'}
            </div>
          </div>
        </div>

        <div className={`border rounded-xl p-3 flex items-center space-x-3 ${
          isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-sm'
        }`}>
          <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <Server className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Активних BMS в базі</div>
            <div className="text-xs font-bold text-emerald-500 font-mono">
              {status.deviceCount} BMS (макс. 20)
            </div>
          </div>
        </div>

        <div className={`border rounded-xl p-3 flex items-center space-x-3 ${
          isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-sm'
        }`}>
          <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            {status.status === 'fetching' ? (
              <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
            ) : status.status === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : status.status === 'error' ? (
              <XCircle className="w-4 h-4 text-rose-500" />
            ) : (
              <Radio className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <div>
            <div className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Стан з'єднання</div>
            <div className="text-xs font-bold font-mono">
              {status.status === 'fetching' ? (
                <span className="text-amber-500 animate-pulse">Опитування Supabase...</span>
              ) : status.status === 'success' ? (
                <span className="text-emerald-500">OK (Дані отримуються)</span>
              ) : status.status === 'error' ? (
                <span className="text-rose-500">Помилка підключення</span>
              ) : (
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Очікування</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error detail if present */}
      {status.lastError && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-400 flex items-start space-x-2">
          <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">Деталі помилки отримання:</div>
            <div>{status.lastError}</div>
          </div>
        </div>
      )}

      {/* Sync Interval and Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        <div>
          <label className={`block text-xs font-medium mb-1.5 flex justify-between ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <span>Період автоопитування Supabase:</span>
            <span className="text-cyan-500 font-mono font-bold">{config.fetchIntervalSec} сек</span>
          </label>
          <div className="flex space-x-2">
            {[2, 3, 5, 10].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => handleSaveField('fetchIntervalSec', sec)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold font-mono border transition-all ${
                  config.fetchIntervalSec === sec
                    ? 'bg-cyan-600 text-white border-cyan-500 shadow-md'
                    : isDark
                    ? 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {sec}с
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end space-x-2">
          <button
            type="button"
            onClick={handleManualFetch}
            disabled={isTesting || !config.enabled}
            className="flex-1 py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            {isTesting ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <DownloadCloud className="w-4 h-4 text-white" />
            )}
            <span>Оновити зараз</span>
          </button>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 shadow-sm'
            }`}
          >
            {isTesting ? (
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-500" />
            ) : (
              <Play className="w-4 h-4 text-cyan-500" />
            )}
            <span>Тест з'єднання</span>
          </button>
        </div>
      </div>

      {/* Discovered Devices Grid */}
      {devices.length > 0 && (
        <div className={`border-t pt-4 space-y-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className={`text-xs font-bold flex items-center space-x-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              <Database className="w-4 h-4 text-cyan-500" />
              <span>Знайдені пристрої BMS в Supabase ({devices.length}):</span>
            </h4>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Пошук BMS..."
                value={searchBms}
                onChange={(e) => setSearchBms(e.target.value)}
                className={`w-full border rounded-lg pl-8 pr-2.5 py-1 text-xs focus:outline-none focus:border-cyan-500 ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {devices
              .filter((d) => d.device_name.toLowerCase().includes(searchBms.toLowerCase()))
              .map((dev) => (
                <div
                  key={dev.device_name}
                  onClick={() => supabaseService.setActiveDeviceName(dev.device_name)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    config.activeDeviceName === dev.device_name || (!config.activeDeviceName && devices[0]?.device_name === dev.device_name)
                      ? isDark
                        ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-100 shadow-md'
                        : 'bg-cyan-50 border-cyan-400 text-cyan-900 shadow-md ring-1 ring-cyan-400'
                      : isDark
                      ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span className="truncate">{dev.device_name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${dev.isOnline ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-800 text-slate-400'}`}>
                      {dev.isOnline ? 'Онлайн' : 'Офлайн'}
                    </span>
                  </div>
                  <div className={`grid grid-cols-3 gap-1 text-[11px] font-mono mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <div>V: <strong className={isDark ? 'text-slate-200' : 'text-slate-900'}>{dev.total_voltage.toFixed(1)}V</strong></div>
                    <div>A: <strong className={isDark ? 'text-slate-200' : 'text-slate-900'}>{dev.current.toFixed(1)}A</strong></div>
                    <div>SOC: <strong className="text-emerald-500">{dev.soc}%</strong></div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Test Result Message */}
      {testResult && (
        <div
          className={`p-3 rounded-xl text-xs flex items-start space-x-2.5 ${
            testResult.success
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <div className="font-bold">{testResult.success ? 'Успішне тестування' : 'Помилка тесту'}</div>
            <div>{testResult.message}</div>
          </div>
        </div>
      )}

      {/* Credentials Toggle (for standard user) */}
      {config.userMode === 'standard' && (
        <div className={`border-t pt-4 flex justify-end ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {showAdvanced ? 'Приховати ключі' : 'Додаткові налаштування ключів'}
          </button>
        </div>
      )}

      {/* Supabase Authentication & Account Creation Section */}
      <div className={`p-5 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-sm'
      }`}>
        <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className={`font-bold text-xs flex items-center space-x-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            <ShieldCheck className="w-4 h-4 text-cyan-500" />
            <span>👤 Вхід в акаунт (Ваш профіль у хмарі)</span>
          </div>
          <span className="text-[10px] text-emerald-500 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
            Авторизація активна
          </span>
        </div>

        {supabaseService.authUser ? (
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border text-xs ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center space-x-3">
              {supabaseService.authUser.avatarUrl ? (
                <img
                  src={supabaseService.authUser.avatarUrl}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full border border-cyan-500/40"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-cyan-600/20 text-cyan-500 border border-cyan-500/40 flex items-center justify-center font-bold text-sm">
                  {supabaseService.authUser.email?.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className={`font-bold flex items-center space-x-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  <span>{supabaseService.authUser.name || 'Обліковий запис Supabase'}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 font-mono border border-emerald-500/30 font-bold">
                    ● Вхід виконано ({supabaseService.authUser.provider})
                  </span>
                </div>
                <div className={`font-mono text-[11px] mt-1 space-y-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  <div>Email: <span className="font-bold">{supabaseService.authUser.email}</span></div>
                  <div className="flex items-center space-x-2 flex-wrap gap-1">
                    <span>Client ID: <code className="bg-slate-800 text-cyan-400 px-1.5 py-0.5 rounded font-mono text-[10px] select-all">{supabaseService.authUser.id}</code></span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(supabaseService.authUser!.id);
                        alert('Client ID скопійовано в буфер обміну!');
                      }}
                      className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500 text-cyan-400 hover:text-white border border-cyan-500/35 text-[10px] font-semibold transition-all cursor-pointer"
                    >
                      Копіювати ID
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => supabaseService.signOut()}
              disabled={supabaseService.isAuthLoading}
              className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/30 text-xs font-semibold transition-all self-start sm:self-center flex items-center space-x-1.5 cursor-pointer"
            >
              <span>Вийти з акаунта</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`p-3 rounded-xl text-xs leading-relaxed border ${
              isDark ? 'bg-cyan-950/30 border-cyan-800/40 text-cyan-200' : 'bg-cyan-50 border-cyan-200 text-cyan-900'
            }`}>
              💡 <strong>Як це працює:</strong> Введіть свій Email і пароль (або створіть акаунт), щоб ваші пристрої надійно зберігалися та були доступні тільки вам.
            </div>

            <div className={`flex rounded-xl p-1 border text-xs font-semibold ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setAuthResponse(null);
                }}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  authMode === 'register'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Реєстрація акаунта</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthResponse(null);
                }}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Увійти в акаунт</span>
              </button>
            </div>

            <form onSubmit={authMode === 'register' ? handleEmailSignUp : handleEmailSignIn} className="space-y-3 pt-1">
              {authMode === 'register' && (
                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Ваше ім'я або нікнейм:
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="Олександр (Опціонально)"
                      className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-cyan-500 ${
                        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Електронна пошта (Email):
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="user@example.com"
                    className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-cyan-500 ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Пароль:
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-cyan-500 ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {authResponse && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                    authResponse.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                  }`}
                >
                  {authResponse.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <span>{authResponse.message}</span>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="submit"
                  disabled={supabaseService.isAuthLoading}
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  {supabaseService.isAuthLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : authMode === 'register' ? (
                    <UserPlus className="w-4 h-4" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  <span>
                    {authMode === 'register'
                      ? 'Зареєструвати персональний акаунт'
                      : 'Увійти в персональний акаунт'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const res = supabaseService.forceLocalAuth(authEmail, authName);
                    setAuthResponse(res);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg transition-all cursor-pointer"
                >
                  <span>⚡ Миттєвий вхід (без очікування листа на пошту)</span>
                </button>
                <p className="text-[10px] text-slate-400 text-center px-1">
                  Якщо лист підтвердження не надходить або Supabase вимагає SMTP, скористайтеся миттєвим входом.
                </p>
              </div>

              <div className={`mt-4 p-3.5 rounded-xl border text-[11px] leading-relaxed ${
                isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <p className="font-semibold text-cyan-500 mb-1 flex items-center gap-1">
                  <span>🔒</span> <span>Конфіденційність та Безпека:</span>
                </p>
                <p>
                  Реєстрація та вхід здійснюються <strong>виключно</strong> у вашому власному проекті Supabase (якщо налаштовано власні ключі нижче), забезпечуючи повну конфіденційність і захист вашої телеметрії від стороннього перегляду.
                </p>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Advanced Credentials Form (For Experts or when toggled) */}
      {(config.userMode === 'expert' || showAdvanced) && (
        <div className={`p-5 rounded-2xl border space-y-4 ${
          isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-sm'
        }`}>
          <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className={`font-bold text-xs flex items-center space-x-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              <Key className="w-4 h-4 text-cyan-500" />
              <span>Параметри та Ключі Персонального Supabase (Експертний Режим)</span>
            </div>
            <button
              type="button"
              onClick={() => {
                supabaseService.resetToDefaultCredentials();
              }}
              className={`text-[11px] font-semibold flex items-center space-x-1 px-2.5 py-1 rounded-lg border ${
                isDark
                  ? 'text-cyan-400 bg-cyan-950/60 border-cyan-800/60 hover:bg-cyan-900/60'
                  : 'text-cyan-700 bg-cyan-50 border-cyan-200 hover:bg-cyan-100'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>Скинути до базових налаштувань</span>
            </button>
          </div>

          {/* URL Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Supabase Project URL:
              </label>
              {localUrl && (
                <button
                  type="button"
                  onClick={() => setLocalUrl('')}
                  className="text-[11px] text-rose-500 hover:text-rose-600 font-medium flex items-center space-x-1"
                >
                  <X className="w-3 h-3" />
                  <span>Очистити URL</span>
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={localUrl}
                onChange={(e) => setLocalUrl(e.target.value)}
                placeholder="Введіть свій URL (напр. https://xyzcompany.supabase.co)"
                className={`w-full border rounded-xl pl-3 pr-10 py-2 text-xs font-mono focus:outline-none focus:border-cyan-500 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900 shadow-sm'
                }`}
              />
              {localUrl && (
                <button
                  type="button"
                  onClick={() => setLocalUrl('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-rose-500"
                  title="Очистити поле"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Скопіюйте Project URL з сайту Supabase &gt; Project Settings &gt; API
            </p>
          </div>

          {/* Key Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Supabase Anon Key (Публічний API Ключ):
              </label>
              {localKey && (
                <button
                  type="button"
                  onClick={() => setLocalKey('')}
                  className="text-[11px] text-rose-500 hover:text-rose-600 font-medium flex items-center space-x-1"
                >
                  <X className="w-3 h-3" />
                  <span>Очистити Ключ</span>
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={localKey}
                onChange={(e) => setLocalKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className={`w-full border rounded-xl pl-3 pr-10 py-2 text-xs font-mono focus:outline-none focus:border-cyan-500 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900 shadow-sm'
                }`}
              />
              {localKey && (
                <button
                  type="button"
                  onClick={() => setLocalKey('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-rose-500"
                  title="Очистити поле"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Публічний ключ "anon public" з розділу API вашого проекту Supabase
            </p>
          </div>

          {/* Table Name Input */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Назва таблиці телеметрії:
            </label>
            <input
              type="text"
              value={localTableName}
              onChange={(e) => setLocalTableName(e.target.value)}
              placeholder="bms_telemetry"
              className={`w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-cyan-500 ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900 shadow-sm'
              }`}
            />
          </div>

          {/* Save & Go to Flashing Button */}
          <div className="pt-3 border-t border-slate-800/40 flex justify-end">
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-cyan-950/40 hover:shadow-cyan-950/60 transition-all cursor-pointer"
            >
              <Cpu className="w-4 h-4 text-cyan-200" />
              <span>Зберегти та перейти до прошивки ESP32</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

