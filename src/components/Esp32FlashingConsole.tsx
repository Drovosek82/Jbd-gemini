import React, { useState } from 'react';
import { Cpu, FolderCode, Terminal, Download, CheckCircle2, Code, KeyRound } from 'lucide-react';
import { FIRMWARE_FILES } from '../lib/firmwareData';
import { supabaseService } from '../lib/supabaseService';

interface Esp32FlashingConsoleProps {
  onChangeTab?: (tab: string) => void;
}

export const Esp32FlashingConsole: React.FC<Esp32FlashingConsoleProps> = () => {
  const [activeFile, setActiveFile] = useState<string>('main.cpp');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [copiedClientId, setCopiedClientId] = useState(false);

  const currentClientId = supabaseService.getCurrentClientId() || 'local_usr_default';

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

  const handleCopyClientId = () => {
    navigator.clipboard.writeText(currentClientId);
    setCopiedClientId(true);
    setTimeout(() => setCopiedClientId(false), 2500);
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

        {/* Client ID & Device Binding Instruction Card */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-emerald-950/80 border border-emerald-800/50 rounded-xl text-emerald-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Ваш поточний Client ID (для прив'язки ESP32)</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Використовується для зв'язку контролера з вашим акаунтом у хмарі
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 font-mono text-xs text-cyan-400">
              <span className="select-all max-w-[220px] sm:max-w-xs truncate">{currentClientId}</span>
              <button
                onClick={handleCopyClientId}
                className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-sans text-xs font-bold transition-all cursor-pointer shrink-0"
              >
                {copiedClientId ? 'Скопійовано!' : 'Копіювати ID'}
              </button>
            </div>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <h4 className="font-bold text-white flex items-center space-x-1.5">
              <span>📌 Для чого потрібні та де вводити Device ID і Client ID:</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="font-bold text-cyan-400">1. Device ID (Ідентифікатор пристрою)</div>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li><strong className="text-white">Що це:</strong> Унікальне ім'я вашої плати (напр. <code className="text-cyan-300 font-mono">bms_001</code> або <code className="text-cyan-300 font-mono">garage_pack</code>).</li>
                  <li><strong className="text-white">Для чого:</strong> Дозволяє розрізняти кілька різних батарей/контролерів в одному парку пристроїв.</li>
                  <li><strong className="text-white">Де вводити:</strong> У файлі <code className="text-cyan-300 font-mono">GLOBAL_STATE.h</code> (<code className="text-cyan-300 font-mono">deviceId = "..."</code>) або на вкладці «Хмара» у веб-панелі ESP32.</li>
                </ul>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="font-bold text-emerald-400">2. Client ID (Ідентифікатор власника)</div>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li><strong className="text-white">Що це:</strong> Ваш персональний унікальний ID користувача (скопіюйте кнопку вище).</li>
                  <li><strong className="text-white">Для чого:</strong> Гарантує повну безпеку: пристрій надсилає дані з вашим <code className="text-emerald-300 font-mono">client_id</code>, тому телеметрію бачите лише ви.</li>
                  <li><strong className="text-white">Де вводити:</strong> Вставте скопійований вище ID у поле «Client ID» на вкладці «Хмара» у веб-інтерфейсі ESP32 або у змінну <code className="text-emerald-300 font-mono">clientId</code> в коді.</li>
                </ul>
              </div>
            </div>
          </div>
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

        {/* Post-Flashing Setup Instructions */}
        <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-2xl p-6 space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            <span>📶 Кроки після прошивки (Wi-Fi, BLE BMS та хмара):</span>
          </div>
          <ol className="list-decimal list-inside space-y-2.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <li><strong className="text-white">Підключіться до точки доступу ESP32:</strong> Після першого увімкнення плата створить Wi-Fi мережу (напр., <code className="text-emerald-300 font-mono">ESP32-BMS-Setup</code>). Підключіться до неї з телефона чи ноутбука.</li>
            <li><strong className="text-white">Відкрийте веб-панель на платі:</strong> Перейдіть у браузері за адресою <code className="text-emerald-300 font-mono">http://192.168.4.1</code>.</li>
            <li><strong className="text-white">Скануйте та налаштуйте Wi-Fi:</strong> Скористайтесь кнопкою <strong className="text-white">«Сканувати»</strong> у розділі Wi-Fi, виберіть вашу домашню мережу роутера, введіть пароль та збережіть. ESP32 перезавантажиться та підключиться до інтернету.</li>
            <li><strong className="text-white">Скануйте та підключіть BMS через BLE (Bluetooth):</strong> Перейдіть до розділу сканування Bluetooth, натисніть <strong className="text-white">«Сканувати BLE»</strong>, щоб знайти вашу BMS (наприклад, JBD/Smart BMS), виберіть її та підключіть.</li>
            <li><strong className="text-white">Введіть ID пристрою та власника у хмарі:</strong> Перейдіть на вкладку <strong className="text-white">«Хмара» (Cloud)</strong> у веб-панелі ESP32 та заповніть:
              <ul className="list-disc list-inside pl-5 mt-1 space-y-1 text-slate-300">
                <li><strong className="text-white">Device ID:</strong> Унікальне ім'я пристрою (напр., <code className="text-emerald-300 font-mono">bms_001</code>).</li>
                <li><strong className="text-white">Client ID:</strong> Вставте ваш скопійований вище <code className="text-emerald-300 font-mono">Client ID</code> з цього додатку.</li>
              </ul>
            </li>
            <li><strong className="text-white">Готово!</strong> Плата почне збирати дані з BMS через Bluetooth та надсилати їх у хмару, і ви зможете моніторити батарею з будь-якої точки світу.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
