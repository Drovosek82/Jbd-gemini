import React, { useState, useEffect } from 'react';
import { langManager, translations } from '../lib/i18n';
import { themeManager } from '../lib/themeManager';
import {
  Cpu,
  Bluetooth,
  Zap,
  Activity,
  Layers,
  Cloud,
  ShieldCheck,
  Bell,
  Monitor,
  CheckCircle2,
  Terminal,
  FileCode,
  Radio,
  BookOpen,
  Sparkles,
  Sun,
  Moon,
  Globe,
  HardDrive,
} from 'lucide-react';

export const AboutAppPage: React.FC = () => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubLang = langManager.subscribe(() => setTick((t) => t + 1));
    const unsubTheme = themeManager.subscribe(() => setTick((t) => t + 1));
    return () => {
      unsubLang();
      unsubTheme();
    };
  }, []);

  const lang = langManager.lang;
  const t = translations[lang].aboutPage;
  const isDark = themeManager.theme === 'dark';

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 animate-fadeIn">
      {/* Top Banner Header */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-6 md:p-8 transition-colors ${
          isDark
            ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-2xl'
            : 'bg-white border-slate-200 text-slate-900 shadow-lg'
        }`}
      >
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.versionBadge}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {t.title}
            </h1>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {t.subtitle}
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            {/* Quick Language Toggle */}
            <button
              onClick={() => langManager.toggleLanguage()}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center space-x-2 transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Globe className="w-4 h-4 text-cyan-500" />
              <span>{lang === 'uk' ? '🇺🇦 Українська' : '🇬🇧 English'}</span>
            </button>

            {/* Quick Theme Toggle */}
            <button
              onClick={() => themeManager.toggleTheme()}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center space-x-2 transition-all cursor-pointer ${
                isDark
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                  : 'bg-slate-900 border-slate-800 text-slate-100 hover:bg-slate-800'
              }`}
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>{translations[lang].theme.light}</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-cyan-400" />
                  <span>{translations[lang].theme.dark}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Key Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isDark
              ? 'bg-slate-900/70 border-slate-800 text-slate-200 hover:border-slate-700'
              : 'bg-white border-slate-200 text-slate-800 shadow-sm hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3">
            <Bluetooth className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm mb-1">{t.quickStats.bleProtocol}</h3>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {t.quickStats.bleDesc}
          </p>
        </div>

        <div
          className={`p-5 rounded-2xl border transition-all ${
            isDark
              ? 'bg-slate-900/70 border-slate-800 text-slate-200 hover:border-slate-700'
              : 'bg-white border-slate-200 text-slate-800 shadow-sm hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm mb-1">{t.quickStats.esp32Boards}</h3>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {t.quickStats.esp32Desc}
          </p>
        </div>

        <div
          className={`p-5 rounded-2xl border transition-all ${
            isDark
              ? 'bg-slate-900/70 border-slate-800 text-slate-200 hover:border-slate-700'
              : 'bg-white border-slate-200 text-slate-800 shadow-sm hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
            <Cloud className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm mb-1">{t.quickStats.cloudSync}</h3>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {t.quickStats.cloudDesc}
          </p>
        </div>

        <div
          className={`p-5 rounded-2xl border transition-all ${
            isDark
              ? 'bg-slate-900/70 border-slate-800 text-slate-200 hover:border-slate-700'
              : 'bg-white border-slate-200 text-slate-800 shadow-sm hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
            <Monitor className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm mb-1">{t.quickStats.displaySupport}</h3>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {t.quickStats.displayDesc}
          </p>
        </div>
      </div>

      {/* Main Features Breakdown Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 border-b pb-3 border-slate-800/80">
          <Layers className="w-5 h-5 text-cyan-400" />
          <h2 className={`text-lg font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {t.featuresTitle}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Feature 1 */}
          <div
            className={`p-5 rounded-2xl border space-y-2 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
              <Zap className="w-4 h-4 shrink-0" />
              <span>{t.feat1Title}</span>
            </div>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {t.feat1Desc}
            </p>
          </div>

          {/* Feature 2 */}
          <div
            className={`p-5 rounded-2xl border space-y-2 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
              <Activity className="w-4 h-4 shrink-0" />
              <span>{t.feat2Title}</span>
            </div>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {t.feat2Desc}
            </p>
          </div>

          {/* Feature 3 */}
          <div
            className={`p-5 rounded-2xl border space-y-2 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
              <FileCode className="w-4 h-4 shrink-0" />
              <span>{t.feat3Title}</span>
            </div>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {t.feat3Desc}
            </p>
          </div>

          {/* Feature 4 */}
          <div
            className={`p-5 rounded-2xl border space-y-2 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-2 text-purple-400 font-bold text-sm">
              <Terminal className="w-4 h-4 shrink-0" />
              <span>{t.feat4Title}</span>
            </div>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {t.feat4Desc}
            </p>
          </div>

          {/* Feature 5 - S3 FH4R2 */}
          <div
            className={`p-5 rounded-2xl border space-y-2 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-2 text-blue-400 font-bold text-sm">
              <HardDrive className="w-4 h-4 shrink-0" />
              <span>{t.feat5Title}</span>
            </div>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {t.feat5Desc}
            </p>
          </div>

          {/* Feature 6 */}
          <div
            className={`p-5 rounded-2xl border space-y-2 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-2 text-sky-400 font-bold text-sm">
              <Cloud className="w-4 h-4 shrink-0" />
              <span>{t.feat6Title}</span>
            </div>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {t.feat6Desc}
            </p>
          </div>

          {/* Feature 7 */}
          <div
            className={`p-5 rounded-2xl border space-y-2 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{t.feat7Title}</span>
            </div>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {t.feat7Desc}
            </p>
          </div>

          {/* Feature 8 */}
          <div
            className={`p-5 rounded-2xl border space-y-2 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm">
              <Bell className="w-4 h-4 shrink-0" />
              <span>{t.feat8Title}</span>
            </div>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {t.feat8Desc}
            </p>
          </div>
        </div>
      </div>

      {/* Hardware Boards & Compatibility */}
      <div
        className={`p-6 rounded-2xl border space-y-4 ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-center space-x-2 text-slate-100 font-bold border-b border-slate-800 pb-3">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <h2 className={`text-base font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {t.hardwareSectionTitle}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className={`p-3 rounded-xl border flex items-center space-x-2 ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{t.boardC3SuperMini}</span>
          </div>
          <div className={`p-3 rounded-xl border flex items-center space-x-2 ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{t.boardS3SuperMini}</span>
          </div>
          <div className={`p-3 rounded-xl border flex items-center space-x-2 ${isDark ? 'bg-slate-950 border-slate-800 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-900'}`}>
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-bold">{t.boardS3FH4R2}</span>
          </div>
          <div className={`p-3 rounded-xl border flex items-center space-x-2 ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{t.boardS3Standard}</span>
          </div>
          <div className={`p-3 rounded-xl border flex items-center space-x-2 ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{t.boardC3Standard}</span>
          </div>
        </div>
      </div>

      {/* Tech Stack & How to Start */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tech Stack */}
        <div
          className={`p-6 rounded-2xl border space-y-3 ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm border-b border-slate-800 pb-2">
            <Radio className="w-4 h-4" />
            <span>{t.techStackTitle}</span>
          </div>
          <ul className={`space-y-2 text-xs font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <li className="flex items-center space-x-2">
              <span className="text-cyan-400">•</span>
              <span>{t.techReact}</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-cyan-400">•</span>
              <span>{t.techTailwind}</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-cyan-400">•</span>
              <span>{t.techWebSerial}</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-cyan-400">•</span>
              <span>{t.techWebBle}</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-cyan-400">•</span>
              <span>{t.techLucide}</span>
            </li>
          </ul>
        </div>

        {/* Quick Start Guide */}
        <div
          className={`p-6 rounded-2xl border space-y-3 ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm border-b border-slate-800 pb-2">
            <BookOpen className="w-4 h-4" />
            <span>{t.howToStartTitle}</span>
          </div>
          <div className={`space-y-2 text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <p>{t.step1}</p>
            <p>{t.step2}</p>
            <p>{t.step3}</p>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center text-xs text-slate-500 pt-4">
        <p>{t.authorFooter}</p>
      </div>
    </div>
  );
};
