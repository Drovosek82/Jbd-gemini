import React, { useState } from 'react';
import { Cpu, FolderCode, Terminal, Download, CheckCircle2, Code } from 'lucide-react';
import { FIRMWARE_FILES } from '../lib/firmwareData';

interface Esp32FlashingConsoleProps {
  onChangeTab?: (tab: string) => void;
}

export const Esp32FlashingConsole: React.FC<Esp32FlashingConsoleProps> = () => {
  const [activeFile, setActiveFile] = useState<string>('main.cpp');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const handleCopyCode = (code: string, fileName: string) => {
    navigator.clipboard.writeText(code);
    setCopiedFile(fileName);
    setTimeout(() => setCopiedFile(null), 2500);
  };

  const handleDownloadFile = (code: string, fileName: string) => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-6">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-cyan-950/80 border border-cyan-800/50 rounded-xl text-cyan-400">
              <Cpu className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Прошивка ESP32 (Локальна папка `/firmware`)</h2>
              <p className="text-sm text-slate-400 mt-1">
                Вихідний код прошивки, створений у нашому додатку для ESP32-S3 Super Mini FH4R2 + ST7789
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-3 py-1.5 bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 rounded-xl text-xs font-mono font-bold">
              Папка проекту: /firmware
            </span>
          </div>
        </div>

        {/* Board & Display Specs summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400 block">Плата</span>
            <strong className="text-white text-sm font-mono">ESP32-S3 Super Mini FH4R2</strong>
          </div>
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400 block">Дисплей</span>
            <strong className="text-white text-sm font-mono">ST7789 240×320</strong>
          </div>
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-1 sm:col-span-2">
            <span className="text-xs text-slate-400 block">Піни дисплея (Фіксовані)</span>
            <div className="text-cyan-300 text-xs font-mono mt-1">
              SCLK=13, MOSI=12, DC=10, CS=9, RST=11, BL=-1
            </div>
          </div>
        </div>

        {/* Firmware Code Viewer & File Tabs */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2 overflow-x-auto py-1">
              <FolderCode className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-xs font-bold text-slate-300 mr-2">Файли /firmware:</span>
              {Object.keys(FIRMWARE_FILES).map((fileName) => (
                <button
                  key={fileName}
                  onClick={() => setActiveFile(fileName)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                    activeFile === fileName
                      ? 'bg-cyan-600 text-white font-bold shadow'
                      : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {fileName}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => handleCopyCode(FIRMWARE_FILES[activeFile], activeFile)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-cyan-400 border border-slate-700 rounded-xl transition-all flex items-center space-x-1.5"
              >
                {copiedFile === activeFile ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Скопійовано!</span>
                  </>
                ) : (
                  <>
                    <Code className="w-3.5 h-3.5" />
                    <span>Копіювати {activeFile}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleDownloadFile(FIRMWARE_FILES[activeFile], activeFile)}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white rounded-xl transition-all flex items-center space-x-1.5 shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Завантажити</span>
              </button>
            </div>
          </div>

          <pre className="p-4 overflow-x-auto text-xs font-mono text-cyan-300 bg-slate-950 leading-relaxed max-h-[500px] scrollbar-thin scrollbar-thumb-slate-800">
            <code>{FIRMWARE_FILES[activeFile]}</code>
          </pre>
        </div>

        {/* Instructions */}
        <div className="bg-cyan-950/25 border border-cyan-800/40 rounded-2xl p-6 space-y-3">
          <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
            <Terminal className="w-5 h-5" />
            <span>Як зібрати та прошити створену прошивку:</span>
          </div>
          <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <li>Усі необхідні файли знаходяться у локальній папці <code className="text-cyan-300 font-mono">/firmware</code> цього додатку.</li>
            <li>Створіть проєкт в <strong className="text-white">Arduino IDE</strong> або <strong className="text-white">PlatformIO</strong> для плати <strong className="text-white">ESP32-S3</strong>.</li>
            <li>Скопіюйте або завантажте файли з папки <code className="text-cyan-300 font-mono">/firmware</code> у свій проєкт.</li>
            <li>Підключіть плату ESP32-S3 Super Mini через USB та виконайте завантаження (Upload).</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
