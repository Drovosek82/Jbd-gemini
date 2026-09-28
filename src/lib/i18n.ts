// Internationalization (i18n) Manager for JBD Smart BMS BLE Manager

export type Language = 'uk' | 'en';

type Listener = () => void;

class LanguageManager {
  private currentLang: Language = 'uk';
  private listeners: Set<Listener> = new Set();

  constructor() {
    const saved = localStorage.getItem('jbd_app_lang') as Language | null;
    if (saved === 'uk' || saved === 'en') {
      this.currentLang = saved;
    }
  }

  public get lang(): Language {
    return this.currentLang;
  }

  public setLanguage(lang: Language) {
    if (this.currentLang === lang) return;
    this.currentLang = lang;
    localStorage.setItem('jbd_app_lang', lang);
    this.notify();
  }

  public toggleLanguage() {
    this.setLanguage(this.currentLang === 'uk' ? 'en' : 'uk');
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export const langManager = new LanguageManager();

export const translations = {
  uk: {
    // Header & Tabs
    appName: 'JBD Smart BMS',
    appSub: 'Bluetooth Моніторинг, ESP32 Прошивка & Supabase Cloud',
    demoMode: 'Демо / Симуляція',
    bleDevice: 'BLE Пристрій',
    connected: 'Підключено',
    connecting: "З'єднання...",
    reconnecting: 'Перепідключення',
    connectBle: 'Підключити BLE',
    bmsOk: 'BMS в нормі',
    protectionActive: 'Захист',
    supabaseCloud: 'Supabase Cloud',
    supabaseOff: 'Supabase Off',
    googleSignIn: 'Google Вхід',

    tabs: {
      dashboard: 'Головна Панель',
      supabase: '☁️ Supabase Cloud',
      fleet: 'Флотилія BMS',
      cells: 'Осередки (Cells)',
      charts: 'Графіки & Історія',
      notifications: 'Сповіщення та Пороги',
      parameters: 'Налаштування BMS',
      flasher: '⚡ Прошивка ESP32',
      logs: 'Діагностика & BLE',
      about: 'ℹ️ Про додаток',
    },

    footer: {
      version: 'JBD Smart BMS BLE Manager v1.2',
      voltage: 'Вольтаж',
      current: 'Струм',
      delta: 'ΔV',
      demo: 'Демо-режим',
      bleConnected: "BLE З'єднано",
      disconnected: 'Непідключено',
    },

    supabaseModes: {
      title: 'Режим підключення до баз даних Supabase',
      modeStandard: 'Простий користувач (Спільна база)',
      modeExpert: 'Експерт (Власна база Supabase)',
      badgeStandard: 'Спільна Хмара Supabase',
      badgeExpert: 'Персональна База',
      standardDesc: 'Ви використовуєте готову спільну базу даних Supabase. Усі дані ваших BMS батарей прив’язані до вашого облікового запису та надійно захищені.',
      expertDesc: 'Експертний режим дозволяє підключити власний проєкт Supabase, власні ключі API, створити таблицю та керувати доступом.',
      expertGuideTitle: '💡 Інструкція: Як створити та налаштувати власну базу Supabase',
      step1Title: '1. Реєстрація проєкту в Supabase',
      step1Body: 'Зареєструйтесь безкоштовно на supabase.com та створіть "New Project". Задайте назву та пароль бази.',
      step2Title: '2. Копіювання Project URL та Anon API Key',
      step2Body: 'В панелі Supabase відкрийте Project Settings > API. Скопіюйте Project URL та anon public key.',
      step3Title: '3. Створення таблиці bms_telemetry',
      step3Body: 'Відкрийте "SQL Editor" у Supabase, вставте підготовлений SQL скрипт з розділу нижче та натисніть "Run".',
      step4Title: '4. Введення даних у додаток',
      step4Body: 'Вставте ваш Project URL та Anon Key у відповідні поля під цією інструкцією та натисніть "Тест з’єднання".',
      step5Title: '5. Прошивка ESP32 під власну базу',
      step5Body: 'На вкладці "⚡ Прошивка ESP32" вкажіть ваш новий Supabase URL для автономної відправки даних шлюзом.',
    },

    // About App Page
    aboutPage: {
      title: 'Про додаток JBD Smart BMS Manager',
      subtitle: 'Професійна веб-платформа для моніторингу, керування, хмарної синхронізації та прошивки мікроконтролерів ESP32 для плати керування батареями JBD Smart BMS.',
      versionBadge: 'Версія 1.2 • Open Hardware & BLE Gateway',
      
      quickStats: {
        bleProtocol: 'JBD BLE Protocol',
        bleDesc: 'Пряме чисте зчитування по Bluetooth 5.0 LE без каблевого зєднання',
        esp32Boards: '5+ ESP32 Моделей',
        esp32Desc: 'C3 Super Mini, S3 Super Mini, S3 FH4R2 (2MB PSRAM), S3/C3 Standard',
        cloudSync: 'Supabase Cloud Sync',
        cloudDesc: 'Синхронізація флоту батарей та онлайн телеметрія з будь-якої точки світу',
        displaySupport: 'ST7789 TFT Дисплей',
        displayDesc: 'Повна підтримка екранів SPI (240x240, 135x240, 170x320) або режим Headless',
      },

      featuresTitle: 'Ключові Функціональні Модулі',

      feat1Title: '1. Моніторинг Телеметрії Реального Часу',
      feat1Desc: 'Отримання напруги батареї, загального струму (заряд/розряд), розрахованої потужності (Вт), рівня заряду (SOC %), температурних датчиків NTC та різниці напруг осередків (Delta V).',

      feat2Title: '2. Поосередковий Аналіз (Cell Voltages)',
      feat2Desc: 'Візуалізація стану кожного окремого елемента (до 32 осередків). Індикація активного балансування осередків, найвищої та найнижчої напруги з підсвічуванням критичних відхилень.',

      feat3Title: '3. Графіки та Аналітика в Реальному Часі',
      feat3Desc: 'Інтерактивні графіки Recharts з часовою шкалою для моніторингу динаміки напруги, струму та температури з підтримкою збереження логів та експорту в CSV.',

      feat4Title: '4. ESP32 USB CDC Прошиватор & Firmware Generator',
      feat4Desc: 'Вбудована консоль Web Serial (Direct USB CDC) для прошивання плат ESP32 безпосередньо з браузера! Автоматична генерація C++ коду Arduino з підтримкою NimBLE-Arduino, бездротового BLE підключення до BMS та підтримки TFT екранів ST7789.',

      feat5Title: '5. Підтримка ESP32-S3 FH4R2 (2MB PSRAM)',
      feat5Desc: 'Спеціалізована підтримка популярного чіпа ESP32-S3FH4R2 із 4MB Flash та 2MB Quad PSRAM прямо на чіпі. Автоматичне налаштування пінів CDC, BLE та SPI для роботи з графічним дисплеєм або у режимі шлюзу.',

      feat6Title: '6. Хмара Supabase Cloud & Управління Флотилією',
      feat6Desc: 'Синхронізація декількох акумуляторних систем BMS у єдиній хмарі. Авторизований доступ через Google OAuth, фільтрація за пристроями та спостереження за станом флотилії резервного живлення.',

      feat7Title: '7. Налаштування Параметрів EEPROM BMS',
      feat7Desc: 'Пряме зчитування та запис регістрів захисту JBD BMS: пороги Overvoltage (OVP), Undervoltage (UVP), Overcurrent (OCP), розрахована ємність та примусове керування ключами Charge/Discharge MOSFET.',

      feat8Title: '8. Сигналізації та Звукові Сповіщення',
      feat8Desc: 'Акустичні та візуальні тривоги у разі спрацювання захистів BMS (коротке замикання, перегрів, перенапруга) із можливістю гнучкого налаштування індивідуальних звукових сигналів.',

      hardwareSectionTitle: 'Підтримуване Апаратне Забезпечення',
      boardC3SuperMini: 'ESP32-C3 Super Mini (RISC-V, USB CDC, Bluetooth LE)',
      boardS3SuperMini: 'ESP32-S3 Super Mini (Dual-Core 240MHz, USB CDC/OTG)',
      boardS3FH4R2: 'ESP32-S3 FH4R2 (4MB Flash + 2MB Embedded PSRAM)',
      boardS3Standard: 'ESP32-S3 Standard DevKit (Dual USB, 44 GPIOs)',
      boardC3Standard: 'ESP32-C3 Standard DevKit (USB-UART / CDC Bridge)',

      techStackTitle: 'Технологічний Стек',
      techReact: 'React 18 + TypeScript + Vite',
      techTailwind: 'Tailwind CSS z високою контрастністю та темами',
      techWebSerial: 'Web Serial API (Direct USB CDC Flashing)',
      techWebBle: 'Web Bluetooth API (JBD BMS Protocol 0xDD 0xA5)',
      techLucide: 'Lucide React + Recharts + NimBLE Arduino',

      howToStartTitle: 'Як Розпочати Роботу',
      step1: '1. Натисніть кнопку "Підключити BLE" у правому верхньому куті.',
      step2: '2. Виберіть пристрій JBD-BMS з списку Bluetooth пристроїв поблизу або увімкніть "Демо-режим" для ознайомлення.',
      step3: '3. Переходьте між вкладками для моніторингу осередків, перегляду графіків або генерації прошивки для ESP32.',

      authorFooter: 'Розроблено для спільноти автономних систем живлення, інверторів та сонячних електростанцій.',
    },

    theme: {
      light: 'Світла тема',
      dark: 'Темна тема',
      toggleTheme: 'Змінити тему (Світла/Темна)',
      language: 'Мова',
    },
  },

  en: {
    // Header & Tabs
    appName: 'JBD Smart BMS',
    appSub: 'Bluetooth Monitoring, ESP32 Flashing & Supabase Cloud',
    demoMode: 'Demo / Simulation',
    bleDevice: 'BLE Device',
    connected: 'Connected',
    connecting: 'Connecting...',
    reconnecting: 'Reconnecting',
    connectBle: 'Connect BLE',
    bmsOk: 'BMS Normal',
    protectionActive: 'Protection',
    supabaseCloud: 'Supabase Cloud',
    supabaseOff: 'Supabase Off',
    googleSignIn: 'Google Sign In',

    tabs: {
      dashboard: 'Dashboard',
      supabase: '☁️ Supabase Cloud',
      fleet: 'BMS Fleet',
      cells: 'Cells Status',
      charts: 'Charts & Logs',
      notifications: 'Alerts & Thresholds',
      parameters: 'BMS Parameters',
      flasher: '⚡ ESP32 Flasher',
      logs: 'Diagnostics & BLE',
      about: 'ℹ️ About App',
    },

    footer: {
      version: 'JBD Smart BMS BLE Manager v1.2',
      voltage: 'Voltage',
      current: 'Current',
      delta: 'ΔV',
      demo: 'Demo Mode',
      bleConnected: 'BLE Connected',
      disconnected: 'Disconnected',
    },

    supabaseModes: {
      title: 'Supabase Database Connection Mode',
      modeStandard: 'Standard User (Shared Database)',
      modeExpert: 'Expert (Custom Supabase Database)',
      badgeStandard: 'Shared Supabase Cloud',
      badgeExpert: 'Personal Custom Database',
      standardDesc: 'You are using the ready-to-use shared Supabase database. All your BMS telemetry is linked to your account and protected via Google OAuth / Row Level Security.',
      expertDesc: 'Expert mode enables connecting your own custom Supabase project, custom API keys, creating tables, and managing database schema.',
      expertGuideTitle: '💡 Guide: How to Create and Setup Your Own Supabase Database',
      step1Title: '1. Create a Supabase Project',
      step1Body: 'Sign up for free at supabase.com and create a "New Project". Choose a name and secure database password.',
      step2Title: '2. Copy Project URL and Anon API Key',
      step2Body: 'In the Supabase dashboard, go to Project Settings > API. Copy your "Project URL" and "anon public key".',
      step3Title: '3. Create the bms_telemetry Table',
      step3Body: 'Open the "SQL Editor" in Supabase, paste the provided SQL script from the section below, and click "Run".',
      step4Title: '4. Enter Credentials in the App',
      step4Body: 'Paste your Project URL and Anon Key into the input fields below and click "Test Connection" to verify.',
      step5Title: '5. Flash ESP32 for Your Own Database',
      step5Body: 'On the "⚡ ESP32 Flasher" tab, set your custom Supabase URL to send telemetry directly from your hardware gateway.',
    },

    // About App Page
    aboutPage: {
      title: 'About JBD Smart BMS Manager',
      subtitle: 'A professional web platform for telemetry monitoring, hardware control, cloud fleet sync, and in-browser ESP32 micro-controller USB CDC flashing for JBD Smart Battery Management Systems.',
      versionBadge: 'Version 1.2 • Open Hardware & BLE Gateway',

      quickStats: {
        bleProtocol: 'JBD BLE Protocol',
        bleDesc: 'Direct wireless telemetry reading via Bluetooth 5.0 LE without serial cables',
        esp32Boards: '5+ ESP32 Models',
        esp32Desc: 'C3 Super Mini, S3 Super Mini, S3 FH4R2 (2MB PSRAM), S3/C3 Standard',
        cloudSync: 'Supabase Cloud Sync',
        cloudDesc: 'Fleet battery synchronization and online telemetry accessible from anywhere',
        displaySupport: 'ST7789 TFT Display',
        displayDesc: 'Full SPI screen support (240x240, 135x240, 170x320) or Headless gateway mode',
      },

      featuresTitle: 'Core Functional Modules',

      feat1Title: '1. Real-Time Telemetry Monitoring',
      feat1Desc: 'Live acquisition of battery pack voltage, total current (charge/discharge), calculated power (W), State of Charge (SOC %), NTC temperature sensors, and cell voltage delta.',

      feat2Title: '2. Cell-by-Cell Voltage Analysis',
      feat2Desc: 'Detailed status visualization for up to 32 individual battery cells. Displays active cell balancing flags, highest/lowest cell voltages, and highlights critical imbalances.',

      feat3Title: '3. Interactive Live Charts & History',
      feat3Desc: 'Timeline charts powered by Recharts for tracking voltage, current, and temperature dynamics over time, complete with log recording and CSV export capability.',

      feat4Title: '4. ESP32 USB CDC Flasher & Code Generator',
      feat4Desc: 'Built-in Web Serial (Direct USB CDC) console for flashing ESP32 boards directly from your browser! Auto-generates Arduino C++ code with NimBLE-Arduino BLE central connection to JBD BMS and ST7789 display support.',

      feat5Title: '5. ESP32-S3 FH4R2 Support (2MB PSRAM)',
      feat5Desc: 'Dedicated configuration for the popular ESP32-S3FH4R2 chip featuring 4MB Flash + 2MB embedded Quad PSRAM inside the chip package. Preset pinouts for Native USB CDC, BLE, and SPI TFT display.',

      feat6Title: '6. Supabase Cloud Sync & Fleet Dashboard',
      feat6Desc: 'Synchronize multiple BMS battery systems in a single cloud database. Google OAuth sign-in, device filtering, and real-time fleet overview for backup power setups.',

      feat7Title: '7. BMS EEPROM Parameters Configuration',
      feat7Desc: 'Read and update hardware protection registers on the JBD BMS: Overvoltage (OVP), Undervoltage (UVP), Overcurrent (OCP), rated capacity, and direct manual toggle of Charge/Discharge MOSFETs.',

      feat8Title: '8. Safety Alerts & Sound Alarms',
      feat8Desc: 'Audible and visual notifications triggered on BMS protection faults (Short Circuit, Over-temperature, Cell Overvoltage) with custom threshold setup.',

      hardwareSectionTitle: 'Supported Micro-Controller Hardware',
      boardC3SuperMini: 'ESP32-C3 Super Mini (RISC-V, Native USB CDC, Bluetooth LE)',
      boardS3SuperMini: 'ESP32-S3 Super Mini (Dual-Core 240MHz, Native USB CDC/OTG)',
      boardS3FH4R2: 'ESP32-S3 FH4R2 (4MB Flash + 2MB Embedded PSRAM)',
      boardS3Standard: 'ESP32-S3 Standard DevKit (Dual USB Ports, 44 GPIOs)',
      boardC3Standard: 'ESP32-C3 Standard DevKit (USB-UART / CDC Bridge)',

      techStackTitle: 'Technology Stack',
      techReact: 'React 18 + TypeScript + Vite',
      techTailwind: 'Tailwind CSS with Dark/Light Theme Support',
      techWebSerial: 'Web Serial API (Direct USB CDC Flashing)',
      techWebBle: 'Web Bluetooth API (JBD BMS Protocol 0xDD 0xA5)',
      techLucide: 'Lucide React + Recharts + NimBLE-Arduino',

      howToStartTitle: 'Quick Start Guide',
      step1: '1. Click "Connect BLE" in the top right header.',
      step2: '2. Select your nearby JBD-BMS Bluetooth device or activate "Demo Mode" for testing.',
      step3: '3. Navigate between tabs to analyze cell voltages, view live charts, or flash an ESP32 gateway.',

      authorFooter: 'Designed for energy storage systems, solar off-grid setups, and battery builders.',
    },

    theme: {
      light: 'Light Theme',
      dark: 'Dark Theme',
      toggleTheme: 'Toggle Theme (Light/Dark)',
      language: 'Language',
    },
  },
};
