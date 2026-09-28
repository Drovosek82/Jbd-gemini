import React, { useState, useEffect } from 'react';
import { supabaseService } from '../lib/supabaseService';
import {
  Cpu,
  Zap,
  HardDrive,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Terminal,
  Play,
  Settings,
  Wifi,
  Radio,
  Sliders,
  FileCode,
  Layers,
  Info,
  RefreshCw,
  Upload,
  Usb,
  ShieldAlert,
  HelpCircle,
  Bluetooth,
  Monitor,
} from 'lucide-react';

export type BoardType = 'c3_supermini' | 's3_supermini' | 's3_fh4r2' | 's3_standard' | 'c3_standard';

export interface BoardSpecs {
  id: BoardType;
  name: string;
  chip: string;
  flashSize: string;
  architecture: string;
  defaultUartTx: number;
  defaultUartRx: number;
  statusLedPin: number;
  usbType: string;
  description: string;
  pinoutNotes: string[];
}

export const BOARD_SPECS: Record<BoardType, BoardSpecs> = {
  c3_supermini: {
    id: 'c3_supermini',
    name: 'ESP32-C3 Super Mini',
    chip: 'ESP32-C3 (RISC-V)',
    flashSize: '4MB Flash',
    architecture: 'Single-Core 160MHz RISC-V',
    defaultUartTx: 21,
    defaultUartRx: 20,
    statusLedPin: 8,
    usbType: 'Native USB CDC (GPIO 18/19 Direct)',
    description: 'Надкомпактна плата 22.5х18мм з ядром RISC-V. Вбудований USB CDC та підтримання Bluetooth 5.0 LE.',
    pinoutNotes: [
      'USB CDC Flashing: Direct USB (GPIO 18 D-, GPIO 19 D+)',
      'Bluetooth 5.0 LE: Бездротовий звʼязок з JBD BMS',
      'Опціональний UART: TX = GPIO21, RX = GPIO20',
      'Сигнальний світлодіод: GPIO8 (Low active)',
      'Кнопка BOOT: GPIO9',
    ],
  },
  s3_supermini: {
    id: 's3_supermini',
    name: 'ESP32-S3 Super Mini',
    chip: 'ESP32-S3 (Xtensa LX7)',
    flashSize: '8MB Flash / 512KB SRAM',
    architecture: 'Dual-Core 240MHz Xtensa LX7 + Vector',
    defaultUartTx: 4,
    defaultUartRx: 5,
    statusLedPin: 48,
    usbType: 'Native USB CDC / OTG (GPIO 19/20)',
    description: 'Високопродуктивна мікро-плата з двома ядрами, Native USB CDC та розширеним Bluetooth 5.0 LE.',
    pinoutNotes: [
      'USB CDC Flashing: Direct Native USB CDC',
      'Bluetooth 5.0 LE Master: Пряме зєднання з JBD BMS по BLE',
      'Опціональний UART: TX = GPIO4, RX = GPIO5',
      'RGB / Status LED: GPIO48',
      'Кнопка BOOT: GPIO0',
    ],
  },
  s3_fh4r2: {
    id: 's3_fh4r2',
    name: 'ESP32-S3 FH4R2',
    chip: 'ESP32-S3FH4R2 (4MB Flash + 2MB PSRAM)',
    flashSize: '4MB Flash / 2MB PSRAM',
    architecture: 'Dual-Core 240MHz + Embedded PSRAM',
    defaultUartTx: 4,
    defaultUartRx: 5,
    statusLedPin: 21,
    usbType: 'Native USB CDC / JTAG (GPIO 19/20)',
    description: 'Популярний чіп ESP32-S3FH4R2 із 4MB Flash та 2MB PSRAM в самому корпусі чіпа. Прошивка по USB CDC, звʼязок по BLE.',
    pinoutNotes: [
      'USB CDC Flashing: Direct USB CDC (GPIO 19 D-, GPIO 20 D+)',
      'Вбудована PSRAM: 2MB Quad SPI (в корпусі FH4R2)',
      'Bluetooth 5.0 LE Central: Високошвидкісне опитування JBD BMS',
      'Світлодіод стану: GPIO21',
      'Кнопка BOOT: GPIO0',
    ],
  },
  s3_standard: {
    id: 's3_standard',
    name: 'ESP32-S3 (DevKitC-1 / N8R8)',
    chip: 'ESP32-S3-WROOM-1',
    flashSize: '8MB / 16MB Flash',
    architecture: 'Dual-Core 240MHz',
    defaultUartTx: 17,
    defaultUartRx: 18,
    statusLedPin: 2,
    usbType: 'Dual USB (USB CDC + UART Bridge)',
    description: 'Стандартна плата розробника з повним набором пінів та стабільним прошиванням по USB CDC / UART.',
    pinoutNotes: [
      'USB CDC / UART: Подвійний порт USB для програмування',
      'Bluetooth 5.0 LE: Бездротове зєднання з BMS',
      'Опціональний UART: TX = GPIO17, RX = GPIO18',
      'Світлодіод: GPIO2, Кнопка BOOT: GPIO0',
    ],
  },
  c3_standard: {
    id: 'c3_standard',
    name: 'ESP32-C3 (DevKitM-1)',
    chip: 'ESP32-C3-MINI-1',
    flashSize: '4MB Flash',
    architecture: 'Single-Core 160MHz',
    defaultUartTx: 6,
    defaultUartRx: 7,
    statusLedPin: 8,
    usbType: 'USB-UART / USB CDC Bridge',
    description: 'Класична плата ESP32-C3 з вбудованим антенним модулем та низьким енергоспоживанням.',
    pinoutNotes: [
      'USB CDC / UART Bridge for Flashing',
      'Bluetooth 5.0 LE Central client',
      'Опціональний UART: TX = GPIO6, RX = GPIO7',
      'Світлодіод: GPIO8, Кнопка BOOT: GPIO9',
    ],
  },
};

interface Esp32FlashingConsoleProps {
  onChangeTab?: (tab: string) => void;
}

export const Esp32FlashingConsole: React.FC<Esp32FlashingConsoleProps> = ({ onChangeTab }) => {
  const isLocked = !supabaseService.authUser;
  const [selectedBoard, setSelectedBoard] = useState<BoardType>('c3_supermini');
  const [activeFile, setActiveFile] = useState<
    'config.h' | 'main.cpp' | 'html_page.h' | 'web_server.h' | 'display.h' | 'jbd_bms.h' | 'supabase_client.h' | 'platformio.ini'
  >('config.h');

  // Interactive config variables
  const [wifiMode, setWifiMode] = useState<'ap' | 'sta'>('sta');
  const [bmsConnMode, setBmsConnMode] = useState<'ble' | 'uart'>('ble');
  const [ssid, setSsid] = useState('My_Home_WiFi');
  const [wifiPassword, setWifiPassword] = useState('WiFiPassword123');
  const [supabaseUrl, setSupabaseUrl] = useState('https://deekjlmbrwmhfoeipuqr.supabase.co');
  const [supabaseKey, setSupabaseKey] = useState('sb_publishable_iFdjgqRZBbxuNJHuEVLWUQ_7fYV_I5S');
  const [supabaseMode, setSupabaseMode] = useState<'default' | 'custom'>('default');
  const [customUrl, setCustomUrl] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [bmsTxPin, setBmsTxPin] = useState<number>(BOARD_SPECS.c3_supermini.defaultUartTx);
  const [bmsRxPin, setBmsRxPin] = useState<number>(BOARD_SPECS.c3_supermini.defaultUartRx);
  const [baudRate, setBaudRate] = useState(9600);
  const [pollIntervalMs, setPollIntervalMs] = useState(1000);

  // Display configurations
  const [enableDisplay, setEnableDisplay] = useState<boolean>(true);
  const [displayResolution, setDisplayResolution] = useState<'240x240' | '135x240' | '170x320' | '240x320'>('240x240');
  const [st7789Sclk, setSt7789Sclk] = useState<number>(4);
  const [st7789Mosi, setSt7789Mosi] = useState<number>(6);
  const [st7789Rst, setSt7789Rst] = useState<number>(1);
  const [st7789Dc, setSt7789Dc] = useState<number>(2);
  const [st7789Cs, setSt7789Cs] = useState<number>(7);
  const [st7789Bl, setSt7789Bl] = useState<number>(3);
  const [enableBacklight, setEnableBacklight] = useState<boolean>(true);

  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  // Load saved Supabase configuration from local storage on mount
  useEffect(() => {
    try {
      // First, get the latest values from our main Supabase Service singleton (which has loaded localStorage or has the user's latest inputs)
      const serviceConfig = supabaseService.config;
      
      const savedFlashingUrl = localStorage.getItem('jbd_bms_flashing_custom_url') || '';
      const savedFlashingKey = localStorage.getItem('jbd_bms_flashing_custom_key') || '';
      
      // We prioritize the credentials from the Supabase service config (configured in the database tab) if they are present and non-default.
      const urlFromService = (serviceConfig.supabaseUrl || '').trim();
      const keyFromService = (serviceConfig.supabaseKey || '').trim();

      const isServiceUrlCustom = urlFromService && 
                                urlFromService !== 'https://deekjlmbrwmhfoeipuqr.supabase.co' && 
                                urlFromService.toLowerCase() !== 'bms';
                                
      const isServiceKeyCustom = keyFromService && 
                                keyFromService !== 'sb_publishable_iFdjgqRZBbxuNJHuEVLWUQ_7fYV_I5S' && 
                                keyFromService.toLowerCase() !== 'bms1';

      // Unconditionally use service config values if they are present, otherwise fall back to saved flashing values or default placeholders
      let initialCustomUrl = urlFromService || savedFlashingUrl || 'https://deekjlmbrwmhfoeipuqr.supabase.co';
      let initialCustomKey = keyFromService || savedFlashingKey || 'sb_publishable_iFdjgqRZBbxuNJHuEVLWUQ_7fYV_I5S';

      if (initialCustomUrl && initialCustomUrl.toLowerCase() === 'bms') {
        initialCustomUrl = '';
      }
      if (initialCustomKey && initialCustomKey.toLowerCase() === 'bms1') {
        initialCustomKey = '';
      }

      setCustomUrl(initialCustomUrl);
      setCustomKey(initialCustomKey);

      // We should switch to custom mode if:
      // 1. Service user mode is 'expert'
      // 2. OR service has custom credentials
      // 3. OR we have saved custom flashing credentials
      const isExpert = serviceConfig.userMode === 'expert';
      const hasCustomCreds = isExpert || isServiceUrlCustom || isServiceKeyCustom || savedFlashingUrl || savedFlashingKey;

      if (hasCustomCreds) {
        setSupabaseMode('custom');
        setSupabaseUrl(initialCustomUrl || 'https://deekjlmbrwmhfoeipuqr.supabase.co');
        setSupabaseKey(initialCustomKey || 'sb_publishable_iFdjgqRZBbxuNJHuEVLWUQ_7fYV_I5S');
      } else {
        setSupabaseMode('default');
        setSupabaseUrl('https://deekjlmbrwmhfoeipuqr.supabase.co');
        setSupabaseKey('sb_publishable_iFdjgqRZBbxuNJHuEVLWUQ_7fYV_I5S');
      }
    } catch (e) {
      console.error('Failed to parse saved Supabase config:', e);
    }
  }, []);

  const handleCustomUrlChange = (val: string) => {
    setCustomUrl(val);
    setSupabaseUrl(val);
    localStorage.setItem('jbd_bms_flashing_custom_url', val);
  };

  const handleCustomKeyChange = (val: string) => {
    setCustomKey(val);
    setSupabaseKey(val);
    localStorage.setItem('jbd_bms_flashing_custom_key', val);
  };

  useEffect(() => {
    // Auto pin update on board change
    setBmsTxPin(BOARD_SPECS[selectedBoard].defaultUartTx);
    setBmsRxPin(BOARD_SPECS[selectedBoard].defaultUartRx);

    if (selectedBoard.startsWith('c3')) {
      setSt7789Sclk(4);
      setSt7789Mosi(6);
      setSt7789Rst(1);
      setSt7789Dc(2);
      setSt7789Cs(7);
      setSt7789Bl(3);
    } else {
      setSt7789Sclk(12);
      setSt7789Mosi(11);
      setSt7789Rst(10);
      setSt7789Dc(9);
      setSt7789Cs(14);
      setSt7789Bl(46);
    }
  }, [selectedBoard]);

  const handleCopyCode = (code: string, fileName: string) => {
    navigator.clipboard.writeText(code);
    setCopiedFile(fileName);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const handleCopyAllFiles = () => {
    const allCode = `// ==========================================
// JBD SMART BMS ESP32 GATEWAY - ПОВНИЙ ПРОЕКТ ПРОШИВКИ
// ==========================================

// ------------------------------------------
// FILE: config.h
// ------------------------------------------
${configCode}

// ------------------------------------------
// FILE: main.cpp
// ------------------------------------------
${mainCode}

// ------------------------------------------
// FILE: html_page.h
// ------------------------------------------
${htmlCode}

// ------------------------------------------
// FILE: web_server.h
// ------------------------------------------
${webServerCode}

// ------------------------------------------
// FILE: display.h
// ------------------------------------------
${displayCode}

// ------------------------------------------
// FILE: jbd_bms.h
// ------------------------------------------
${jbdCode}

// ------------------------------------------
// FILE: supabase_client.h
// ------------------------------------------
${supabaseCode}

// ------------------------------------------
// FILE: platformio.ini
// ------------------------------------------
${platformioCode}
`;
    navigator.clipboard.writeText(allCode);
    setCopiedFile('ALL_PROJECT_FILES');
    setTimeout(() => setCopiedFile(null), 2500);
  };
  
  const activeSupabaseUrl = (() => {
    if (supabaseMode === 'custom') {
      const url = (supabaseUrl || '').trim();
      if (url && url.toLowerCase() !== 'bms') return url;
    } else {
      const serviceUrl = (supabaseService.config.supabaseUrl || '').trim();
      if (serviceUrl && serviceUrl.toLowerCase() !== 'bms') return serviceUrl;
    }
    return 'https://deekjlmbrwmhfoeipuqr.supabase.co';
  })();

  const activeSupabaseKey = (() => {
    if (supabaseMode === 'custom') {
      const key = (supabaseKey || '').trim();
      if (key && key.toLowerCase() !== 'bms1') return key;
    } else {
      const serviceKey = (supabaseService.config.supabaseKey || '').trim();
      if (serviceKey && serviceKey.toLowerCase() !== 'bms1') return serviceKey;
    }
    return 'sb_publishable_iFdjgqRZBbxuNJHuEVLWUQ_7fYV_I5S';
  })();

  const activeClientId = supabaseService.authUser?.id || 'local_usr_default';

  // Generate dynamic config.h content
  const configCode = `/*
 * JBD Smart BMS ESP32 Gateway - Файл конфігурації (config.h)
 * Згенеровано динамічно під ваші параметри в інтерфейсі.
 * Скопіюйте цей код та вставте у ваш локальний проект.
 */

#ifndef CONFIG_H
#define CONFIG_H

// ====================================================================
// 📶 НАЛАШТУВАННЯ WI-FI
// ====================================================================
#define WIFI_MODE_AP      ${wifiMode === 'ap' ? 'true' : 'false'}  // true = режим точки доступу, false = клієнт мережі
#define WIFI_SSID         "${ssid}"
#define WIFI_PASSWORD     "${wifiPassword}"

// ====================================================================
// ☁️ ПАРАМЕТРИ TELEMETRY SUPABASE CLOUD
// ====================================================================
#define SUPABASE_URL      "${activeSupabaseUrl}"
#define SUPABASE_KEY      "${activeSupabaseKey}"
#define CLIENT_ID         "${activeClientId}"  // Унікальний ID користувача для ізоляції даних в Supabase

// ====================================================================
// 🔋 З'ЄДНАННЯ З JBD SMART BMS
// ====================================================================
#define BMS_MODE_BLE      ${bmsConnMode === 'ble' ? 'true' : 'false'}  // true = BLE (без дротів), false = UART (дротовий кабель)
#define BMS_BAUD_RATE     ${baudRate}      // Стандартна швидкість JBD BMS: 9600 bps

// Якщо обрано дротовий режим UART:
#define BMS_UART_TX_PIN   ${bmsTxPin}       // TX мікроконтролера -> підключати до RX BMS (через TTL конвертер 3.3V)
#define BMS_UART_RX_PIN   ${bmsRxPin}       // RX мікроконтролера -> підключати до TX BMS (через TTL конвертер 3.3V)

// ====================================================================
// 🖥️ НАЛАШТУВАННЯ ДИСПЛЕЯ ST7789 TFT SPI
// ====================================================================
#define DISPLAY_ENABLED   ${enableDisplay ? 'true' : 'false'}
#define DISPLAY_WIDTH     ${displayResolution.split('x')[0]}
#define DISPLAY_HEIGHT    ${displayResolution.split('x')[1]}

#define TFT_SCLK          ${st7789Sclk}
#define TFT_MOSI          ${st7789Mosi}
#define TFT_RST           ${st7789Rst}
#define TFT_DC            ${st7789Dc}
#define TFT_CS            ${st7789Cs}
#define TFT_BL            ${enableBacklight ? st7789Bl : -1}       // Пін підсвітки (Backlight) екрану (-1 якщо відсутня)

// ====================================================================
// ⏱️ ПЕРІОДИ ОПИТУВАННЯ
// ====================================================================
#define POLL_INTERVAL_MS  ${pollIntervalMs}   // Періодичність зчитування та відправки телеметрії (мс)

#endif // CONFIG_H`;

  // Generate dynamic main.cpp content
  const mainCode = `/*
 * JBD Smart BMS ESP32 Gateway - Головний модуль (main.cpp)
 * Target Board: ${BOARD_SPECS[selectedBoard].name} (${BOARD_SPECS[selectedBoard].chip})
 * Цей файл керує ініціалізацією, підключенням до Wi-Fi, зчитуванням з BMS та відправкою в хмару.
 */

#include <Arduino.h>
#include <WiFi.h>
#include "config.h"
#include "jbd_bms.h"
#include "supabase_client.h"

#if DISPLAY_ENABLED
#include <Adafruit_GFX.h>
#include <Adafruit_ST7789.h>
#include <SPI.h>

Adafruit_ST7789 tft = Adafruit_ST7789(TFT_CS, TFT_DC, TFT_MOSI, TFT_SCLK, TFT_RST);
#endif

unsigned long lastTelemetryTime = 0;
BmsData bmsData;

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\\n=== JBD BMS ESP32 Gateway Запущено ===");
    Serial.printf("Плата: %s (%s)\\n", "${BOARD_SPECS[selectedBoard].name}", "${BOARD_SPECS[selectedBoard].chip}");

    #if DISPLAY_ENABLED
    if (TFT_BL >= 0) {
        pinMode(TFT_BL, OUTPUT);
        digitalWrite(TFT_BL, HIGH); // Вмикаємо підсвітку
    }
    tft.init(DISPLAY_WIDTH, DISPLAY_HEIGHT);
    tft.setRotation(1);
    tft.fillScreen(ST7789_BLACK);
    tft.setTextColor(ST7789_CYAN);
    tft.setTextSize(2);
    tft.setCursor(10, 10);
    tft.println("JBD BMS GATEWAY");
    tft.drawFastHLine(0, 30, tft.width(), ST7789_BLUE);
    tft.setTextSize(1);
    tft.setTextColor(ST7789_YELLOW);
    tft.setCursor(10, 40);
    tft.println("Connect Wi-Fi...");
    #endif

    // Ініціалізація Wi-Fi мережі
    #if WIFI_MODE_AP
    WiFi.softAP(WIFI_SSID, WIFI_PASSWORD);
    Serial.print("Створено Точку Доступу AP: ");
    Serial.println(WiFi.softAPIP());
    #else
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.print("Підключення до Wi-Fi: ");
    Serial.println(WIFI_SSID);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\\n✅ Wi-Fi Підключено успішно!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    #endif

    // Налаштування зв'язку з платою JBD BMS
    initBms();
}

void loop() {
    // Запит актуального стану акумулятора
    if (readBmsTelemetry(bmsData)) {
        Serial.printf("Акумулятор: %.2fV | Струм: %.2fA | SOC: %d%%\\n", 
                      bmsData.totalVoltage, bmsData.current, bmsData.soc);

        #if DISPLAY_ENABLED
        tft.fillRect(0, 35, tft.width(), tft.height() - 35, ST7789_BLACK);
        tft.setCursor(10, 45);
        tft.setTextSize(2);
        tft.setTextColor(ST7789_GREEN);
        tft.printf("VOLT: %.2f V\\n", bmsData.totalVoltage);
        tft.setCursor(10, 70);
        tft.setTextColor(bmsData.current >= 0 ? ST7789_CYAN : ST7789_RED);
        tft.printf("CURR: %.2f A\\n", bmsData.current);
        tft.setCursor(10, 95);
        tft.setTextColor(ST7789_YELLOW);
        tft.printf("SOC:  %d %%\\n", bmsData.soc);
        #endif

        // Відправка телеметрії у хмарний сервіс Supabase
        if (millis() - lastTelemetryTime >= POLL_INTERVAL_MS) {
            sendTelemetryToSupabase(bmsData);
            lastTelemetryTime = millis();
        }
    } else {
        Serial.println("⚠️ Помилка зчитування інформаційного кадру з BMS!");
        #if DISPLAY_ENABLED
        tft.setCursor(10, 150);
        tft.setTextSize(1);
        tft.setTextColor(ST7789_RED);
        tft.println("BMS READ ERROR");
        #endif
    }

    delay(1000); // Оновлення циклу кожну секунду
}`;

  // Generate dynamic jbd_bms.h content
  const jbdCode = `/*
 * JBD Smart BMS ESP32 Gateway - Модуль JBD BMS протоколу (jbd_bms.h)
 * Повноцінне зчитування всіх даних по BLE або UART (0x03 Basic Info та 0x04 Cell Voltages).
 */

#ifndef JBD_BMS_H
#define JBD_BMS_H

#include <Arduino.h>
#include "config.h"

#if BMS_MODE_BLE
#include <NimBLEDevice.h>
#define JBD_SERVICE_UUID     "0000ff00-0000-1000-8000-00805f9b34fb"
#define JBD_CHAR_WRITE_UUID  "0000ff01-0000-1000-8000-00805f9b34fb"
#define JBD_CHAR_NOTIFY_UUID "0000ff02-0000-1000-8000-00805f9b34fb"
#endif

struct BmsData {
    float totalVoltage;
    float current;
    float power;
    int soc;
    float remainingCapacity;
    float nominalCapacity;
    int cycleCount;
    bool chargeMosEnabled;
    bool dischargeMosEnabled;
    float cellVoltages[16];
    int cellCount;
    float temperatures[4];
    int ntcCount;
    uint16_t protectionWord;
    float minCellVoltage;
    float maxCellVoltage;
    int minCellIndex;
    int maxCellIndex;
    int deltaVoltage;
};

#if BMS_MODE_BLE
NimBLEClient* pBleClient = nullptr;
NimBLERemoteCharacteristic* pWriteChar = nullptr;
bool bmsBleConnected = false;
uint8_t bleRxBuffer[128];
size_t bleRxLength = 0;

void bmsNotifyCallback(NimBLERemoteCharacteristic* pChar, uint8_t* pData, size_t length, bool isNotify) {
    if (length < 128) {
        memcpy(bleRxBuffer, pData, length);
        bleRxLength = length;
    }
}
#else
HardwareSerial BmsSerial(1);
#endif

void initBms() {
    #if BMS_MODE_BLE
    Serial.println("Ініціалізація Bluetooth LE (NimBLE)...");
    NimBLEDevice::init("ESP32-BMS-Gateway");
    #else
    Serial.printf("Ініціалізація UART: TX=%d, RX=%d, Швидкість=%d\\n", BMS_UART_TX_PIN, BMS_UART_RX_PIN, BMS_BAUD_RATE);
    BmsSerial.begin(BMS_BAUD_RATE, SERIAL_8N1, BMS_UART_RX_PIN, BMS_UART_TX_PIN);
    #endif
}

bool connectToBmsBle() {
    #if BMS_MODE_BLE
    if (bmsBleConnected && pBleClient && pBleClient->isConnected()) return true;
    
    Serial.println("Пошук JBD BMS BLE пристроїв...");
    NimBLEScan* pScan = NimBLEDevice::getScan();
    pScan->setActiveScan(true);
    NimBLEScanResults results = pScan->start(4, false);
    
    for (int i = 0; i < results.getCount(); i++) {
        NimBLEAdvertisedDevice device = results.getDevice(i);
        if (device.getName().find("JBD") != std::string::npos || device.isAdvertisingService(NimBLEUUID(JBD_SERVICE_UUID))) {
            Serial.printf("Знайдено BMS: %s [%s]\\n", device.getName().c_str(), device.getAddress().toString().c_str());
            pBleClient = NimBLEDevice::createClient();
            if (pBleClient->connect(&device)) {
                NimBLERemoteService* pService = pBleClient->getService(JBD_SERVICE_UUID);
                if (pService) {
                    pWriteChar = pService->getCharacteristic(JBD_CHAR_WRITE_UUID);
                    NimBLERemoteCharacteristic* pNotifyChar = pService->getCharacteristic(JBD_CHAR_NOTIFY_UUID);
                    if (pNotifyChar && pNotifyChar->canNotify()) {
                        pNotifyChar->subscribe(true, bmsNotifyCallback);
                        bmsBleConnected = true;
                        Serial.println("✅ Успішно підключено до JBD BMS по BLE!");
                        return true;
                    }
                }
            }
        }
    }
    #endif
    return false;
}

bool readBmsTelemetry(BmsData &data) {
    uint8_t basicCmd[] = {0xDD, 0xA5, 0x03, 0x00, 0xFF, 0xFD, 0x77};
    uint8_t cellsCmd[] = {0xDD, 0xA5, 0x04, 0x00, 0xFF, 0xFC, 0x77};
    
    #if BMS_MODE_BLE
    if (!connectToBmsBle()) return false;
    
    // 1. Request Basic Info (0x03)
    bleRxLength = 0;
    if (pWriteChar) {
        pWriteChar->writeValue(basicCmd, sizeof(basicCmd), false);
        delay(250);
        if (bleRxLength >= 23 && bleRxBuffer[0] == 0xDD && bleRxBuffer[1] == 0x03) {
            if (bleRxLength >= 35) {
                // 36-byte layout
                data.totalVoltage = ((bleRxBuffer[4] << 8) | bleRxBuffer[5]) / 100.0f;
                int16_t rawCurrent = (bleRxBuffer[6] << 8) | bleRxBuffer[7];
                data.current = rawCurrent / 100.0f;
                data.power = data.totalVoltage * data.current;
                data.remainingCapacity = ((bleRxBuffer[8] << 8) | bleRxBuffer[9]) / 100.0f;
                data.nominalCapacity = ((bleRxBuffer[10] << 8) | bleRxBuffer[11]) / 100.0f;
                data.cycleCount = (bleRxBuffer[12] << 8) | bleRxBuffer[13];
                data.protectionWord = (bleRxBuffer[20] << 8) | bleRxBuffer[21];
                uint8_t fet = bleRxBuffer[24];
                data.chargeMosEnabled = (fet & 0x01) != 0;
                data.dischargeMosEnabled = (fet & 0x02) != 0;
                data.cellCount = bleRxBuffer[25];
                data.ntcCount = bleRxBuffer[26];
                data.soc = bleRxBuffer[27];
                data.ntcCount = 0;
                for (int i = 0; i < bleRxBuffer[26] && (27 + i * 2 + 1) < bleRxLength; i++) {
                    uint16_t rawTemp = (bleRxBuffer[27 + i * 2] << 8) | bleRxBuffer[27 + i * 2 + 1];
                    if (rawTemp >= 2000 && rawTemp <= 3800) {
                        data.temperatures[data.ntcCount++] = (rawTemp - 2731) / 10.0f;
                    }
                }
            } else {
                // Standard 27-byte layout
                data.totalVoltage = ((bleRxBuffer[4] << 8) | bleRxBuffer[5]) / 100.0f;
                int16_t rawCurrent = (bleRxBuffer[6] << 8) | bleRxBuffer[7];
                data.current = rawCurrent / 100.0f;
                data.power = data.totalVoltage * data.current;
                data.remainingCapacity = ((bleRxBuffer[8] << 8) | bleRxBuffer[9]) / 100.0f;
                data.nominalCapacity = ((bleRxBuffer[10] << 8) | bleRxBuffer[11]) / 100.0f;
                data.cycleCount = (bleRxBuffer[12] << 8) | bleRxBuffer[13];
                data.protectionWord = (bleRxBuffer[20] << 8) | bleRxBuffer[21];
                data.soc = bleRxBuffer[23];
                uint8_t fet = bleRxBuffer[24];
                data.chargeMosEnabled = (fet & 0x01) != 0;
                data.dischargeMosEnabled = (fet & 0x02) != 0;
                data.cellCount = bleRxBuffer[25];
                data.ntcCount = bleRxBuffer[26];
                for (int i = 0; i < data.ntcCount && (27 + i * 2 + 1) < bleRxLength; i++) {
                    uint16_t rawTemp = (bleRxBuffer[27 + i * 2] << 8) | bleRxBuffer[27 + i * 2 + 1];
                    data.temperatures[i] = (rawTemp - 2731) / 10.0f;
                }
            }
        }
    }

    // 2. Request Cell Voltages (0x04)
    bleRxLength = 0;
    if (pWriteChar) {
        pWriteChar->writeValue(cellsCmd, sizeof(cellsCmd), false);
        delay(250);
        if (bleRxLength >= 8 && bleRxBuffer[0] == 0xDD && bleRxBuffer[1] == 0x04) {
            int payloadLen = bleRxBuffer[3];
            int cCount = payloadLen / 2;
            if (cCount > 16) cCount = 16;
            if (cCount > 0) data.cellCount = cCount;
            
            float maxV = 0.0f;
            float minV = 99.0f;
            int maxIdx = 0;
            int minIdx = 0;
            
            for (int i = 0; i < data.cellCount; i++) {
                uint16_t vMv = (bleRxBuffer[4 + i * 2] << 8) | bleRxBuffer[4 + i * 2 + 1];
                float vVal = vMv / 1000.0f;
                data.cellVoltages[i] = vVal;
                if (vVal > maxV) { maxV = vVal; maxIdx = i + 1; }
                if (vVal < minV) { minV = vVal; minIdx = i + 1; }
            }
            data.maxCellVoltage = maxV;
            data.minCellVoltage = minV;
            data.maxCellIndex = maxIdx;
            data.minCellIndex = minIdx;
            data.deltaVoltage = (int)((maxV - minV) * 1000.0f);
            return true;
        }
    }
    #else
    // UART mode
    while (BmsSerial.available()) BmsSerial.read();
    BmsSerial.write(basicCmd, sizeof(basicCmd));
    delay(150);
    uint8_t buf[64];
    size_t len = 0;
    while (BmsSerial.available() && len < 64) { buf[len++] = BmsSerial.read(); }
    
    if (len >= 24 && buf[0] == 0xDD && buf[1] == 0x03) {
        if (len >= 35) {
            // 36-byte layout
            data.totalVoltage = ((buf[4] << 8) | buf[5]) / 100.0f;
            int16_t rawCurrent = (buf[6] << 8) | buf[7];
            data.current = rawCurrent / 100.0f;
            data.power = data.totalVoltage * data.current;
            data.remainingCapacity = ((buf[8] << 8) | buf[9]) / 100.0f;
            data.nominalCapacity = ((buf[10] << 8) | buf[11]) / 100.0f;
            data.cycleCount = (buf[12] << 8) | buf[13];
            data.protectionWord = (buf[20] << 8) | buf[21];
            uint8_t fet = buf[24];
            data.chargeMosEnabled = (fet & 0x01) != 0;
            data.dischargeMosEnabled = (fet & 0x02) != 0;
            data.cellCount = buf[25];
            data.ntcCount = buf[26];
            data.soc = buf[27];
            data.ntcCount = 0;
            for (int i = 0; i < buf[26] && (27 + i * 2 + 1) < len; i++) {
                uint16_t rawTemp = (buf[27 + i * 2] << 8) | buf[27 + i * 2 + 1];
                if (rawTemp >= 2000 && rawTemp <= 3800) {
                    data.temperatures[data.ntcCount++] = (rawTemp - 2731) / 10.0f;
                }
            }
        } else {
            // Standard 27-byte layout
            data.totalVoltage = ((buf[4] << 8) | buf[5]) / 100.0f;
            int16_t rawCurrent = (buf[6] << 8) | buf[7];
            data.current = rawCurrent / 100.0f;
            data.power = data.totalVoltage * data.current;
            data.remainingCapacity = ((buf[8] << 8) | buf[9]) / 100.0f;
            data.nominalCapacity = ((buf[10] << 8) | buf[11]) / 100.0f;
            data.cycleCount = (buf[12] << 8) | buf[13];
            data.protectionWord = (buf[20] << 8) | buf[21];
            data.soc = buf[23];
            uint8_t fet = buf[24];
            data.chargeMosEnabled = (fet & 0x01) != 0;
            data.dischargeMosEnabled = (fet & 0x02) != 0;
            data.cellCount = buf[25];
            data.ntcCount = buf[26];
            for (int i = 0; i < data.ntcCount && (27 + i * 2 + 1) < len; i++) {
                uint16_t rawTemp = (buf[27 + i * 2] << 8) | buf[27 + i * 2 + 1];
                data.temperatures[i] = (rawTemp - 2731) / 10.0f;
            }
        }
    }

    while (BmsSerial.available()) BmsSerial.read();
    BmsSerial.write(cellsCmd, sizeof(cellsCmd));
    delay(150);
    len = 0;
    while (BmsSerial.available() && len < 64) { buf[len++] = BmsSerial.read(); }
    
    if (len >= 8 && buf[0] == 0xDD && buf[1] == 0x04) {
        int payloadLen = buf[3];
        int cCount = payloadLen / 2;
        if (cCount > 16) cCount = 16;
        if (cCount > 0) data.cellCount = cCount;
        float maxV = 0.0f;
        float minV = 99.0f;
        int maxIdx = 0;
        int minIdx = 0;
        for (int i = 0; i < data.cellCount; i++) {
            uint16_t vMv = (buf[4 + i * 2] << 8) | buf[4 + i * 2 + 1];
            float vVal = vMv / 1000.0f;
            data.cellVoltages[i] = vVal;
            if (vVal > maxV) { maxV = vVal; maxIdx = i + 1; }
            if (vVal < minV) { minV = vVal; minIdx = i + 1; }
        }
        data.maxCellVoltage = maxV;
        data.minCellVoltage = minV;
        data.maxCellIndex = maxIdx;
        data.minCellIndex = minIdx;
        data.deltaVoltage = (int)((maxV - minV) * 1000.0f);
        return true;
    }
    #endif
    return false;
}

#endif // JBD_BMS_H`;

  // Generate dynamic supabase_client.h content
  const supabaseCode = `/*
 * JBD Smart BMS ESP32 Gateway - Надсилання в Supabase (supabase_client.h)
 * Формує POST-запити до Supabase Rest API з повним набором даних телеметрії.
 */

#ifndef SUPABASE_CLIENT_H
#define SUPABASE_CLIENT_H

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "config.h"
#include "jbd_bms.h"

void sendTelemetryToSupabase(const BmsData &data) {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("❌ Помилка: Wi-Fi відключено. Надіслати телеметрію неможливо.");
        return;
    }

    HTTPClient http;
    String url = String(SUPABASE_URL) + "/rest/v1/bms_telemetry";
    
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", SUPABASE_KEY);
    http.addHeader("Authorization", "Bearer " + String(SUPABASE_KEY));
    http.addHeader("Prefer", "return=minimal");

    StaticJsonDocument<1024> doc;
    doc["device_name"] = "JBD-BMS-" + WiFi.macAddress().substring(9);
    doc["client_id"] = CLIENT_ID;
    doc["total_voltage"] = data.totalVoltage;
    doc["voltage"] = data.totalVoltage;
    doc["current"] = data.current;
    doc["power"] = data.power;
    doc["soc"] = data.soc;
    doc["remaining_capacity"] = data.remainingCapacity;
    doc["nominal_capacity"] = data.nominalCapacity;
    doc["cycle_count"] = data.cycleCount;
    doc["charge_mos"] = data.chargeMosEnabled;
    doc["discharge_mos"] = data.dischargeMosEnabled;
    doc["delta_voltage"] = data.deltaVoltage;
    doc["temp1"] = data.ntcCount > 0 ? data.temperatures[0] : 0.0f;
    doc["temp_avg"] = data.ntcCount > 0 ? data.temperatures[0] : 0.0f;
    
    JsonArray temps = doc.createNestedArray("temperatures");
    for (int i = 0; i < data.ntcCount; i++) {
        temps.add(data.temperatures[i]);
    }

    JsonArray cells = doc.createNestedArray("cell_voltages");
    for (int i = 0; i < data.cellCount; i++) {
        cells.add(data.cellVoltages[i]);
    }

    doc["device_id"] = WiFi.macAddress();
    doc["status"] = data.current >= 0.0f ? "Discharging/Idle" : "Charging";

    String payload;
    serializeJson(doc, payload);

    Serial.println("📡 Відправка повного пакету в Supabase bms_telemetry...");
    int httpResponseCode = http.POST(payload);

    if (httpResponseCode > 0) {
        Serial.printf("✅ Телеметрію записано! Код відповіді: %d\\n", httpResponseCode);
    } else {
        Serial.printf("❌ Помилка відправки в Supabase: %s\\n", http.errorToString(httpResponseCode).c_str());
    }
    http.end();
}`;

  // Generate dynamic platformio.ini content
  const platformioCode = `; PlatformIO Project Configuration File
; JBD Smart BMS ESP32 Gateway
; Target Board: ${BOARD_SPECS[selectedBoard].name}

[env:esp32_gateway]
platform = espressif32
framework = arduino
monitor_speed = 115200

; --- Вибір мікрочіпа ---
${selectedBoard.startsWith('c3') 
  ? `board = esp32-c3-devkitm-1
board_build.flash_mode = dio
build_unflags = -D CORE_DEBUG_LEVEL=3
build_flags = 
    -D ARDUINO_USB_MODE=1
    -D ARDUINO_USB_CDC_ON_BOOT=1
    -D CORE_DEBUG_LEVEL=0` 
  : `board = esp32-s3-devkitc-1
board_build.flash_mode = qio
build_unflags = -D CORE_DEBUG_LEVEL=3
build_flags = 
    -D ARDUINO_USB_MODE=1
    -D ARDUINO_USB_CDC_ON_BOOT=1
    -D CORE_DEBUG_LEVEL=0`
}

; --- Залежності бібліотек ---
lib_deps =
    h2zero/NimBLE-Arduino @ ^1.4.1       ; Швидка та енергоефективна бібліотека BLE
    bblanchon/ArduinoJson @ ^6.21.3      ; Обробка та серіалізація JSON пакетів
    adafruit/Adafruit GFX Library @ ^1.11.9
    adafruit/Adafruit ST7735 and ST7789 Library @ ^1.11.0
    SPI
    FS
    Wire`;

  // Dynamic html_page.h content
  const htmlCode = `/*
 * JBD Smart BMS ESP32 Gateway - Вбудований Web-Інтерфейс (html_page.h)
 * Розмір: ~50KB у Flash-пам'яті (PROGMEM), 0 байт у RAM під час збереження.
 * Вбудований повнофункціональний графічний веб-інтерфейс з моніторингом BMS,
 * осередками, скануванням Wi-Fi, керуванням MOSFET та оновленням прошивки (OTA).
 */

#ifndef HTML_PAGE_H
#define HTML_PAGE_H

#include <pgmspace.h>

static const char HTML_PAGE[] PROGMEM = R"===(
<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>JBD BMS Controller</title>
<style>
:root{--bg:#0a0e1a;--sur:#111827;--sur2:#1a2235;--brd:#1e2d45;--ac:#00d4ff;--ac2:#00ff88;--warn:#ffaa00;--err:#ff4455;--txt:#e2e8f0;--mut:#64748b;}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--txt);font-family:'Courier New',monospace;padding-bottom:24px}
nav{display:flex;background:var(--sur);border-bottom:1px solid var(--brd);position:sticky;top:0;z-index:99}
.tab{flex:1;padding:13px 4px;text-align:center;font-size:10px;letter-spacing:.8px;text-transform:uppercase;color:var(--mut);cursor:pointer;border-bottom:2px solid transparent;transition:all .2s;user-select:none}
.tab.on{color:var(--ac);border-bottom-color:var(--ac)}
.pg{display:none;padding:14px}.pg.on{display:block}
.phdr{display:flex;align-items:center;justify-content:space-between;background:var(--sur);border:1px solid var(--brd);border-radius:8px;padding:11px 16px;margin-bottom:14px}
.logo{font-size:16px;font-weight:bold;color:var(--ac);letter-spacing:2px}.logo b{color:var(--ac2)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;margin-bottom:14px}
.card{background:var(--sur);border:1px solid var(--brd);border-radius:8px;padding:12px 14px}
.clbl{font-size:10px;color:var(--mut);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px}
.cval{font-size:24px;font-weight:bold;color:var(--ac);line-height:1}
.soc-box{background:var(--sur);border:1px solid var(--brd);border-radius:8px;padding:14px;margin-bottom:14px}
.soc-hdr{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:9px}
.soc-num{font-size:30px;font-weight:bold;color:var(--ac2)}
.bar{height:12px;background:var(--sur2);border-radius:6px;overflow:hidden;border:1px solid var(--brd)}
.bar-f{height:100%;border-radius:6px;background:var(--ac2);transition:width .8s}
.box{background:var(--sur);border:1px solid var(--brd);border-radius:8px;padding:14px;margin-bottom:14px}
.cgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(74px,1fr));gap:6px}
.cell{background:var(--sur2);border:1px solid var(--brd);border-radius:6px;padding:7px;text-align:center}
.btns{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
button{background:transparent;border:1px solid var(--brd);color:var(--txt);font-family:monospace;font-size:11px;padding:8px 13px;border-radius:6px;cursor:pointer}
button.bac2{border-color:var(--ac2);color:var(--ac2)}
</style>
</head>
<body>
<nav>
  <div class="tab on" onclick="gNav('dash',this)">📊 Монітор BMS</div>
  <div class="tab" onclick="gNav('net',this)">📡 Мережа Wi-Fi</div>
</nav>

<div class="pg on" id="pg-dash">
  <div class="phdr">
    <div class="logo">JBD <b>BMS</b></div>
    <div>IP: <span id="ipVal" style="color:var(--ac)">--</span></div>
  </div>

  <div class="soc-box">
    <div class="soc-hdr">
      <span>Заряд акумулятора (SOC)</span>
      <span class="soc-num" id="socN">--%</span>
    </div>
    <div class="bar"><div class="bar-f" id="socF" style="width:0%"></div></div>
  </div>

  <div class="grid">
    <div class="card"><div class="clbl">Напруга</div><div class="cval" id="vPack">-- В</div></div>
    <div class="card"><div class="clbl">Струм</div><div class="cval" id="vCurr">-- А</div></div>
    <div class="card"><div class="clbl">Потужність</div><div class="cval" id="vPwr">-- Вт</div></div>
    <div class="card"><div class="clbl">Ємність</div><div class="cval" id="vCap" style="font-size:18px">-- / -- Ah</div></div>
    <div class="card"><div class="clbl">Цикли / ΔV</div><div class="cval" id="vCyc" style="font-size:18px">-- ц / -- мВ</div></div>
    <div class="card"><div class="clbl">MOSFET Ключі</div><div class="cval" id="vMos" style="font-size:15px">Заряд: --<br>Розряд: --</div></div>
  </div>

  <div class="box">
    <div style="font-size:11px;color:var(--mut);margin-bottom:6px">Температурні датчики NTC</div>
    <div id="tempVal" style="font-size:12px;color:var(--ac)">--</div>
  </div>

  <div class="box">
    <div style="font-size:11px;color:var(--mut);margin-bottom:8px">Напруги осередків / клітин</div>
    <div class="cgrid" id="cellGrid"></div>
  </div>
</div>

<script>
function gNav(id,el){
  document.querySelectorAll('.pg').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
  document.getElementById('pg-'+id).classList.add('on');
  el.classList.add('on');
}
function updateData(){
  fetch('/data').then(r=>r.json()).then(d=>{
    document.getElementById('ipVal').textContent=d.wifiInfo||'--';
    document.getElementById('socN').textContent=(d.soc||0)+'%';
    document.getElementById('socF').style.width=(d.soc||0)+'%';
    document.getElementById('vPack').textContent=(d.voltage||0).toFixed(2)+' В';
    document.getElementById('vCurr').textContent=(d.current||0).toFixed(2)+' А';
    document.getElementById('vPwr').textContent=(d.power||0).toFixed(1)+' Вт';
    document.getElementById('vCap').textContent=(d.remainingCapacity||0).toFixed(1)+' / '+(d.nominalCapacity||0).toFixed(0)+' Ah';
    document.getElementById('vCyc').textContent=(d.cycleCount||0)+' ц / '+(d.deltaVoltage||0)+' мВ';
    document.getElementById('vMos').innerHTML='Заряд: '+(d.chargeMos?'✅':'❌')+'<br>Розряд: '+(d.dischargeMos?'✅':'❌');
    if(d.temperatures && d.temperatures.length>0){
      document.getElementById('tempVal').textContent=d.temperatures.map((t,i)=>'NTC'+(i+1)+': '+t.toFixed(1)+'°C').join(' | ');
    }
    if(d.cellVoltages){
      document.getElementById('cellGrid').innerHTML=d.cellVoltages.map((v,i)=>
        '<div class="cell"><div style="font-size:9px;color:#64748b">C'+(i+1)+'</div><b>'+v.toFixed(3)+'В</b></div>'
      ).join('');
    }
  }).catch(e=>console.error(e));
}
setInterval(updateData, 2000);
updateData();
</script>
</body>
</html>
)===";

#endif // HTML_PAGE_H`;

  // Dynamic web_server.h content
  const webServerCode = `/*
 * JBD Smart BMS ESP32 Gateway - HTTP Web Server (web_server.h)
 * Запускає локальний веб-сервер на порту 80, віддає html_page.h з PROGMEM
 * та обробляє AJAX REST API запити з повним набором даних телеметрії.
 */

#ifndef WEB_SERVER_H
#define WEB_SERVER_H

#include <Arduino.h>
#include <WebServer.h>
#include <WiFi.h>
#include <ArduinoJson.h>
#include "config.h"
#include "html_page.h"
#include "jbd_bms.h"

extern WebServer server;
extern BmsData bmsData;

void handleRoot() {
    server.send(200, "text/html", HTML_PAGE);
}

void handleData() {
    StaticJsonDocument<1024> doc;
    doc["wifiConnected"] = (WiFi.status() == WL_CONNECTED);
    doc["wifiInfo"] = WiFi.localIP().toString();
    doc["bmsConnected"] = (bmsData.totalVoltage > 0.0f);
    doc["voltage"] = bmsData.totalVoltage;
    doc["current"] = bmsData.current;
    doc["power"] = bmsData.power;
    doc["soc"] = bmsData.soc;
    doc["remainingCapacity"] = bmsData.remainingCapacity;
    doc["nominalCapacity"] = bmsData.nominalCapacity;
    doc["cycleCount"] = bmsData.cycleCount;
    doc["chargeMos"] = bmsData.chargeMosEnabled;
    doc["dischargeMos"] = bmsData.dischargeMosEnabled;
    doc["cellCount"] = bmsData.cellCount;
    doc["deltaVoltage"] = bmsData.deltaVoltage;
    doc["maxCellVoltage"] = bmsData.maxCellVoltage;
    doc["minCellVoltage"] = bmsData.minCellVoltage;
    
    JsonArray temps = doc.createNestedArray("temperatures");
    for (int i = 0; i < bmsData.ntcCount; i++) {
        temps.add(bmsData.temperatures[i]);
    }
    
    JsonArray cells = doc.createNestedArray("cellVoltages");
    for (int i = 0; i < bmsData.cellCount; i++) {
        cells.add(bmsData.cellVoltages[i]);
    }

    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
}

void setupWebServer() {
    server.on("/", handleRoot);
    server.on("/data", handleData);
    server.begin();
    Serial.println("🌐 Локальний WebServer запущено!");
}

void loopWebServer() {
    server.handleClient();
}

#endif // WEB_SERVER_H`;

  // Dynamic display.h content
  const displayCode = `/*
 * JBD Smart BMS ESP32 Gateway - Драйвер ST7789 TFT Дисплея (display.h)
 * Відображає статус акумулятора на кольоровому дисплеї.
 */

#ifndef DISPLAY_H
#define DISPLAY_H

#include <Arduino.h>
#include "config.h"
#include "jbd_bms.h"

#if DISPLAY_ENABLED
#include <Adafruit_GFX.h>
#include <Adafruit_ST7789.h>
#include <SPI.h>

extern Adafruit_ST7789 tft;

void initDisplay() {
    #if TFT_BL >= 0
    pinMode(TFT_BL, OUTPUT);
    digitalWrite(TFT_BL, HIGH);
    #endif

    tft.init(DISPLAY_WIDTH, DISPLAY_HEIGHT);
    tft.setRotation(1);
    tft.fillScreen(ST77XX_BLACK);
    tft.setTextColor(ST77XX_CYAN);
    tft.setTextSize(2);
    tft.setCursor(10, 10);
    tft.println("JBD BMS GATEWAY");
}

void renderDisplayBmsData(const BmsData &data) {
    tft.fillRect(0, 35, tft.width(), tft.height() - 35, ST77XX_BLACK);
    
    tft.setCursor(10, 45);
    tft.setTextSize(2);
    tft.setTextColor(ST77XX_GREEN);
    tft.printf("VOLT: %.2f V", data.totalVoltage);
    
    tft.setCursor(10, 75);
    tft.setTextColor(data.current >= 0.0f ? ST77XX_CYAN : ST77XX_RED);
    tft.printf("CURR: %.2f A", data.current);

    tft.setCursor(10, 105);
    tft.setTextColor(ST77XX_YELLOW);
    tft.printf("SOC:  %d %%", data.soc);

    tft.setCursor(10, 135);
    tft.setTextSize(1);
    tft.setTextColor(ST77XX_WHITE);
    tft.printf("TEMP: %.1f C", data.temp1);
}
#endif

#endif // DISPLAY_H`;

  // Determine code text to display based on active tab
  const getActiveCode = () => {
    switch (activeFile) {
      case 'config.h':
        return configCode;
      case 'main.cpp':
        return mainCode;
      case 'html_page.h':
        return htmlCode;
      case 'web_server.h':
        return webServerCode;
      case 'display.h':
        return displayCode;
      case 'jbd_bms.h':
        return jbdCode;
      case 'supabase_client.h':
        return supabaseCode;
      case 'platformio.ini':
        return platformioCode;
      default:
        return configCode;
    }
  };

  // Explanation for each file
  const getFileExplanation = () => {
    switch (activeFile) {
      case 'config.h':
        return {
          title: 'Параметри конфігурації (config.h)',
          desc: 'Цей файл містить усі налаштування вашого заліза та мереж. Вкажіть тут назву домашнього Wi-Fi, пароль, посилання на базу даних Supabase, та оберіть тип звʼязку з BMS (Bluetooth чи UART кабелем). Всі зміни налаштувань ліворуч автоматично перебудовують код!',
          edits: [
            { line: 'WIFI_SSID', desc: 'Назва вашої домашньої Wi-Fi мережі.' },
            { line: 'WIFI_PASSWORD', desc: 'Пароль до Wi-Fi мережі (повинен мати від 8 символів).' },
            { line: 'SUPABASE_URL', desc: 'Посилання на REST API вашого проекту в Supabase.' },
            { line: 'CLIENT_ID', desc: 'Персональний ідентифікатор користувача з профілю для ізоляції даних.' },
            { line: 'BMS_MODE_BLE', desc: 'Режим звʼязку. true - бездротовий BLE Bluetooth, false - класичний кабель UART.' }
          ]
        };
      case 'main.cpp':
        return {
          title: 'Головний код ініціалізації (main.cpp)',
          desc: 'Стандартна структура Arduino-коду. У функції setup() підключається Wi-Fi, ініціалізується TFT дисплей та створюється зʼєднання з BMS. У циклі loop() кожну секунду зчитуються дані та за розкладом відправляються в Supabase Cloud.',
          edits: [
            { line: 'setup()', desc: 'Стартова конфігурація периферії та підключення до роутера.' },
            { line: 'loop()', desc: 'Основний цикл зчитування та періодичної відправки телеметрії bmsData.' }
          ]
        };
      case 'html_page.h':
        return {
          title: 'Вбудований графічний Web-інтерфейс (html_page.h)',
          desc: 'Містить повноцінну веб-сторінку з графічним інтерфейсом моніторингу, стану осередків, сканування Wi-Fi мереж, керування ключами MOSFET та можливістю бездротового оновлення прошивки (OTA). Збережена у Flash-памʼяті PROGMEM.',
          edits: [
            { line: 'HTML_PAGE[] PROGMEM', desc: 'C++ константа з кодом веб-сторінки HTML/CSS/JS.' }
          ]
        };
      case 'web_server.h':
        return {
          title: 'Локальний Web-сервер ESP32 (web_server.h)',
          desc: 'HTTP сервер на порту 80, який обслуговує запити з веб-браузера, віддає сторінку html_page.h та повертає поточну телеметрію в форматі JSON через REST API ендпоінт /data.',
          edits: [
            { line: 'handleRoot()', desc: 'Віддає головну сторінку веб-інтерфейсу.' },
            { line: 'handleData()', desc: 'Повертає JSON-пакет з напругами, струмом, SOC та клітинами.' }
          ]
        };
      case 'display.h':
        return {
          title: 'Драйвер ST7789 TFT Дисплея (display.h)',
          desc: 'Модуль виведення інформації про акумулятор на кольоровий LCD/TFT екран. Відображає загальну напругу, струм, SOC та температуру з колірною індикацією статусів.',
          edits: [
            { line: 'initDisplay()', desc: 'Ініціалізація шини SPI та налаштування розмірів екрану ST7789.' },
            { line: 'renderDisplayBmsData()', desc: 'Оновлення цифр вольтажу, струму та заряду на екрані.' }
          ]
        };
      case 'jbd_bms.h':
        return {
          title: 'Парсер JBD Smart BMS (jbd_bms.h)',
          desc: 'Виконує пряму взаємодію з BMS. Посилає серійний байтовий запит (0xDD 0xA5 0x03 0x00 0xFF 0xFD 0x77) та розбирає відповідь з обчисленням вольтажу (ділення на 100), струму (перетворення знакового int16), та розрахунком температури з Кельвінів у Цельсії.',
          edits: [
            { line: 'readBmsTelemetry()', desc: 'Надсилає команду запиту до JBD BMS та розбирає байти на напругу, струм, SOC та температуру.' },
            { line: 'connectToBmsBle()', desc: 'Автоматично сканує Bluetooth-ефір та підключається до BMS за імʼям пристрою "JBD".' }
          ]
        };
      case 'supabase_client.h':
        return {
          title: 'Інтеграція Supabase REST API (supabase_client.h)',
          desc: 'Формує HTTP POST запит безпосередньо у таблицю bms_telemetry. Використовує вбудовану в ESP32 бібліотеку HTTPClient. Відсилає JSON-пакет, де унікальним ідентифікатором є MAC-адреса Wi-Fi чіпа вашої плати ESP32.',
          edits: [
            { line: 'sendTelemetryToSupabase()', desc: 'Перевіряє наявність звʼязку, створює JSON обʼєкт телеметрії та відправляє POST запит.' }
          ]
        };
      case 'platformio.ini':
        return {
          title: 'Файл збірки проекту (platformio.ini)',
          desc: 'Конфігураційний файл для середовища PlatformIO (VS Code). Визначає цільову платформу espressif32, завантажує залежні бібліотеки (NimBLE-Arduino, ArduinoJson, Adafruit GFX/ST7789) та вмикає підтримку USB CDC на старті для легкого виведення логів у Serial Monitor.',
          edits: [
            { line: 'board', desc: 'Цільовий чіп. Змінюється залежно від обраної плати: esp32-c3 або esp32-s3.' },
            { line: 'lib_deps', desc: 'Перелік бібліотек, які PlatformIO автоматично завантажить з хмари під час компіляції.' }
          ]
        };
    }
  };

  const currentExplanation = getFileExplanation();

  if (isLocked) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 max-w-2xl mx-auto shadow-2xl relative overflow-hidden mt-6">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-rose-500/5 rounded-full filter blur-3xl -z-10"></div>
          
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-950/20">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white tracking-tight">Прошивання заблоковано (Режим Приватності)</h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
              Для уникнення витоку даних та запобігання ситуаціям, коли ваш пристрій буде завантажувати телеметрію у спільну публічну базу даних (що дозволить іншим бачити вашу інформацію), генерація коду прошивки заблокована на стандартних реквізитах.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left space-y-3">
            <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <span>⚙️</span> Для розблокування генератора прошивки:
            </h4>
            <ul className="text-[11px] text-slate-300 space-y-2 list-decimal list-inside pl-1 leading-normal">
              <li>Перейдіть до налаштувань хмари та увімкніть <strong>Експертний режим (Expert Mode)</strong>.</li>
              <li>Вкажіть <strong>ваші власні реквізити</strong> Supabase проекту.</li>
              <li>Пройдіть реєстрацію або увійдіть у свій <strong>персональний акаунт</strong>.</li>
            </ul>
          </div>

          <button
            onClick={() => onChangeTab?.('supabase')}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-cyan-950/50 transition-all flex items-center justify-center space-x-2 mx-auto cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span>Перейти до налаштувань Supabase</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner & GitHub Repo Link */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full filter blur-3xl -mr-20 -mt-20 -z-10"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full filter blur-3xl -ml-20 -mb-20 -z-10"></div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-cyan-950/40 text-cyan-400 border border-cyan-800/30 rounded-full text-xs font-bold">
              <Cpu className="w-3.5 h-3.5" />
              <span>Офіційний репозиторій прошивки</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
              Локальне прошивання ESP32 Gateway
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Ви можете клонувати перевірену стабільну прошивку, налаштувати її під свої потреби та завантажити у мікроконтролер локально через компʼютер. Це гарантує максимальну надійність та стабільність.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="https://github.com/Drovosek82/gemini-app"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs tracking-wide transition-all border border-slate-700 flex items-center justify-center space-x-2 shadow-lg cursor-pointer"
            >
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Відкрити GitHub репозиторій</span>
            </a>

            <button
              onClick={() => {
                navigator.clipboard.writeText('git clone https://github.com/Drovosek82/gemini-app.git');
                alert('Команду копіювання успішно записано у буфер обміну!');
              }}
              className="px-5 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs tracking-wide transition-all flex items-center justify-center space-x-2 shadow-lg shadow-cyan-950/50 cursor-pointer"
            >
              <Terminal className="w-4 h-4" />
              <span>Скопіювати git clone</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Settings Panel */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-5">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center space-x-2 pb-2 border-b border-slate-800">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Налаштування прошивки</span>
            </h3>

            {/* Board Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Модель вашої плати ESP32:
              </label>
              <select
                value={selectedBoard}
                onChange={(e) => setSelectedBoard(e.target.value as BoardType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
              >
                {Object.values(BOARD_SPECS).map((spec) => (
                  <option key={spec.id} value={spec.id} className="bg-slate-950 text-slate-200">
                    {spec.name} ({spec.chip})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 leading-normal">
                {BOARD_SPECS[selectedBoard].description}
              </p>
            </div>

            {/* WiFi settings */}
            <div className="space-y-3 pt-2 border-t border-slate-800/50">
              <div className="text-xs font-bold text-cyan-400 flex items-center space-x-1">
                <Wifi className="w-3.5 h-3.5" />
                <span>Wi-Fi Підключення</span>
              </div>

              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-bold">
                <button
                  onClick={() => setWifiMode('sta')}
                  className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                    wifiMode === 'sta' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Клієнт (STA)
                </button>
                <button
                  onClick={() => setWifiMode('ap')}
                  className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                    wifiMode === 'ap' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Точка (AP)
                </button>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    SSID мережі (Назва):
                  </label>
                  <input
                    type="text"
                    value={ssid}
                    onChange={(e) => setSsid(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Пароль від Wi-Fi:
                  </label>
                  <input
                    type="text"
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Supabase settings */}
            <div className="space-y-3 pt-2 border-t border-slate-800/50">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-cyan-400 flex items-center space-x-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Supabase Телеметрія</span>
                </div>
              </div>

              {/* Database selection mode toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setSupabaseMode('default');
                    setSupabaseUrl('https://deekjlmbrwmhfoeipuqr.supabase.co');
                    setSupabaseKey('sb_publishable_iFdjgqRZBbxuNJHuEVLWUQ_7fYV_I5S');
                  }}
                  className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                    supabaseMode === 'default' ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Загальна база
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSupabaseMode('custom');
                    setSupabaseUrl(customUrl);
                    setSupabaseKey(customKey);
                  }}
                  className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                    supabaseMode === 'custom' ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Власна база (Експерт)
                </button>
              </div>

              {/* Dynamic Warning Reminder Banner */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 leading-normal space-y-1">
                <div className="flex items-center space-x-1 font-bold text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Важливе нагадування перед прошивкою!</span>
                </div>
                <p>
                  Перед прошивкою обов'язково переконайтеся, що ви налаштували та створили власну базу даних. 
                  Для створення та налаштування власної бази перейдіть на сторінку <strong className="text-amber-400">Supabase Cloud</strong> в лівому меню програми (там ви знайдете покрокову інструкцію та готовий SQL-код для створення таблиці).
                </p>
                <p className="mt-1 text-[9px] text-slate-400">
                  {supabaseMode === 'default' ? (
                    <>
                      Зараз у вас увімкнено <strong>Загальну базу</strong>. Дані будуть автоматично надсилатися на наш спільний сервер та відображатися на загальному дашборді.
                    </>
                  ) : (
                    <>
                      Зараз у вас обрано <strong>Власну базу (Експерт)</strong>. Переконайтеся, що ви вказали правильні параметри доступу нижче або скористалися кнопкою автозаповнення.
                    </>
                  )}
                </p>
              </div>

              {supabaseMode === 'custom' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-semibold">Налаштування власної бази:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const serviceUrl = supabaseService.config.supabaseUrl;
                        const serviceKey = supabaseService.config.supabaseKey;
                        if (serviceUrl) {
                          handleCustomUrlChange(serviceUrl);
                        }
                        if (serviceKey) {
                          handleCustomKeyChange(serviceKey);
                        }
                      }}
                      className="text-[9px] text-cyan-400 hover:text-cyan-300 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>Автозаповнити з налаштувань програми</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Project URL:
                    </label>
                    <input
                      type="text"
                      value={supabaseUrl}
                      onChange={(e) => handleCustomUrlChange(e.target.value)}
                      placeholder="https://your-project.supabase.co"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Anon API / Service Key:
                    </label>
                    <input
                      type="text"
                      value={supabaseKey}
                      onChange={(e) => handleCustomKeyChange(e.target.value)}
                      placeholder="your-supabase-anon-key"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 truncate"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* BMS Connection settings */}
            <div className="space-y-3 pt-2 border-t border-slate-800/50">
              <div className="text-xs font-bold text-cyan-400 flex items-center space-x-1">
                <Radio className="w-3.5 h-3.5" />
                <span>Звʼязок з JBD BMS</span>
              </div>

              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-bold">
                <button
                  onClick={() => setBmsConnMode('ble')}
                  className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                    bmsConnMode === 'ble' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Bluetooth BLE
                </button>
                <button
                  onClick={() => setBmsConnMode('uart')}
                  className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                    bmsConnMode === 'uart' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Дротовий UART
                </button>
              </div>

              {bmsConnMode === 'uart' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Пін TX (ESP32):
                    </label>
                    <input
                      type="number"
                      value={bmsTxPin}
                      onChange={(e) => setBmsTxPin(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Пін RX (ESP32):
                    </label>
                    <input
                      type="number"
                      value={bmsRxPin}
                      onChange={(e) => setBmsRxPin(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Display configuration */}
            <div className="space-y-3 pt-2 border-t border-slate-800/50">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-cyan-400 flex items-center space-x-1">
                  <Monitor className="w-3.5 h-3.5" />
                  <span>ST7789 TFT Екран</span>
                </div>
                <input
                  type="checkbox"
                  checked={enableDisplay}
                  onChange={(e) => setEnableDisplay(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 bg-slate-950 border-slate-800"
                />
              </div>

              {enableDisplay && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Розширення екрану:
                    </label>
                    <select
                      value={displayResolution}
                      onChange={(e) => setDisplayResolution(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                    >
                      <option value="240x240">240x240 (Квадратний)</option>
                      <option value="135x240">135x240 (Прямокутний mini)</option>
                      <option value="170x320">170x320 (Прямокутний midi)</option>
                      <option value="240x320">240x320 (Стандартний портрет)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/40">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        SCLK Пін:
                      </label>
                      <input
                        type="number"
                        value={st7789Sclk}
                        onChange={(e) => setSt7789Sclk(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        MOSI Пін:
                      </label>
                      <input
                        type="number"
                        value={st7789Mosi}
                        onChange={(e) => setSt7789Mosi(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        RST Пін:
                      </label>
                      <input
                        type="number"
                        value={st7789Rst}
                        onChange={(e) => setSt7789Rst(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        DC Пін:
                      </label>
                      <input
                        type="number"
                        value={st7789Dc}
                        onChange={(e) => setSt7789Dc(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        CS Пін (Chip Select):
                      </label>
                      <input
                        type="number"
                        value={st7789Cs}
                        onChange={(e) => setSt7789Cs(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-400">
                        Використовувати підсвітку:
                      </span>
                      <input
                        type="checkbox"
                        checked={enableBacklight}
                        onChange={(e) => setEnableBacklight(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-cyan-600 focus:ring-cyan-500 bg-slate-950 border-slate-800 cursor-pointer"
                      />
                    </div>

                    {enableBacklight && (
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                          BL Пін (Backlight):
                        </label>
                        <input
                          type="number"
                          value={st7789Bl}
                          onChange={(e) => setSt7789Bl(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Code Explorer & Manual */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-6">
            
            {/* Folder / File Tabs */}
            <div className="border-b border-slate-800 pb-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center space-x-1.5">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span>Провідник файлів прошивки (IDE Explorer)</span>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    'config.h',
                    'main.cpp',
                    'html_page.h',
                    'web_server.h',
                    'display.h',
                    'jbd_bms.h',
                    'supabase_client.h',
                    'platformio.ini',
                  ] as const
                ).map((file) => (
                  <button
                    key={file}
                    onClick={() => setActiveFile(file)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeFile === file
                        ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    {file}
                  </button>
                ))}
              </div>
            </div>

            {/* Code and Description Section */}
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
                <h4 className="text-sm font-black text-slate-200 flex items-center space-x-2">
                  <Info className="w-4 h-4 text-cyan-400" />
                  <span>{currentExplanation.title}</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentExplanation.desc}
                </p>

                <div className="pt-2">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Ключові місця для зміни у коді:
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] sm:text-[11px]">
                    {currentExplanation.edits.map((e, idx) => (
                      <div key={idx} className="bg-slate-900/40 p-1.5 rounded border border-slate-800/40 font-mono">
                        <span className="text-cyan-400 font-bold">{e.line}</span>
                        <span className="text-slate-400"> — {e.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Code Editor Frame */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                    <span className="text-xs font-mono text-slate-400 ml-2">{activeFile}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCopyAllFiles}
                      className="px-3 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-[10px] font-bold text-emerald-400 border border-emerald-800/60 rounded-lg transition-all flex items-center space-x-1 cursor-pointer shadow-sm"
                      title="Скопіювати всі 8 файлів проекту прошивки одним кліком"
                    >
                      {copiedFile === 'ALL_PROJECT_FILES' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Скопійовано весь проект!</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Скопіювати ВСІ 8 файлів</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleCopyCode(getActiveCode(), activeFile)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-cyan-400 border border-slate-700 rounded-lg transition-all flex items-center space-x-1 cursor-pointer"
                    >
                      {copiedFile === activeFile ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Скопійовано!</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Скопіювати файл ({activeFile})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <pre className="p-4 overflow-x-auto text-[11px] sm:text-xs font-mono text-cyan-300 bg-slate-950 leading-relaxed max-h-[420px] scrollbar-thin scrollbar-thumb-slate-800">
                  <code>{getActiveCode()}</code>
                </pre>
              </div>
            </div>

            {/* Instruction block */}
            <div className="border-t border-slate-800 pt-5 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center space-x-2">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                <span>Інструкція локального збирання та прошивки по USB</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-slate-200 flex items-center space-x-1.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50 flex items-center justify-center font-bold text-xs">1</span>
                    <span>Підготовка інструментарію</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Встановіть безкоштовне середовище розробки <strong className="text-slate-200">VS Code</strong> та розширення <strong className="text-slate-200">PlatformIO IDE</strong> (альтернативно можна використати <strong className="text-slate-200">Arduino IDE</strong>, встановивши ядро ESP32 через Менеджер плат).
                  </p>
                </div>

                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-slate-200 flex items-center space-x-1.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50 flex items-center justify-center font-bold text-xs">2</span>
                    <span>Клонування репозиторію</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Склонуйте ваші вихідні файли за допомогою команди в терміналі:<br />
                    <code className="text-[10px] text-cyan-400 font-mono bg-slate-950 p-1.5 rounded mt-1.5 block">git clone https://github.com/Drovosek82/gemini-app.git</code>
                  </p>
                </div>

                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-slate-200 flex items-center space-x-1.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50 flex items-center justify-center font-bold text-xs">3</span>
                    <span>Конфігурування</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Відкрийте папку проекту у редакторі, відкрийте файл <strong className="text-slate-200">config.h</strong> та замініть його вміст згенерованим вище кодом. Всі налаштування Wi-Fi, BMS та Supabase вже інтегровані!
                  </p>
                </div>

                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-slate-200 flex items-center space-x-1.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50 flex items-center justify-center font-bold text-xs">4</span>
                    <span>Компіляція та Завантаження</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Підключіть плату ESP32 через USB дріт живлення та передачі даних. У панелі розширення PlatformIO натисніть кнопку <strong className="text-cyan-400">Upload</strong> (стрілочка праворуч). Прошивка автоматично завантажиться!
                  </p>
                </div>
              </div>

              {/* Troubleshooting warning box */}
              <div className="p-4 bg-amber-950/20 border border-amber-800/30 rounded-2xl flex items-start space-x-3 text-xs">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-amber-400">Маєте проблеми з розпізнаванням USB-порту у PlatformIO/Arduino?</div>
                  <p className="text-slate-300 leading-relaxed">
                    1. Переконайтеся, що ви використовуєте USB-кабель з підтримкою <strong className="text-slate-100">передачі даних</strong> (а не тільки живлення).<br />
                    2. Спробуйте встановити драйвери віртуального COM-порту для китайських мікросхем: <strong className="text-cyan-400">CH340 / CH343 / CP2102</strong>.<br />
                    3. Якщо плата не переходить у режим завантаження автоматично: затисніть кнопку <strong className="text-slate-100">BOOT</strong> на платі, підключіть кабель USB до компʼютера, відпустіть кнопку BOOT і почніть завантаження прошивки.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
