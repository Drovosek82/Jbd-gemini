export const FIRMWARE_FILES: Record<string, string> = {
  'main.cpp': `// main.cpp - BMS Controller Local Monitor
// ESP32-S3 Super Mini with JBD BMS, WiFi Manager, Web Interface

#include <Arduino.h>
#include "GLOBAL_STATE.h"
#include "wifi_manager.h"
#include "bms.h"
#include "display.h"
#include "web_server.h"
#include "api_client.h"

void setup() {
  // Initialize Serial
  Serial.begin(115200);
  Serial.println("[Main] =========================================");
  Serial.println("[Main] ESP32-C3 BMS Controller v2.0");
  Serial.println("[Main] =========================================");

  // Load saved preferences at startup
  loadBMSConfig();
  loadWiFiConfig();

  // Initialize Mutex for BMS data protection
  bmsDataMutex = xSemaphoreCreateMutex();
  if (bmsDataMutex == nullptr) {
    Serial.println("[Main] Помилка створення мутексу!");
  }

  Serial.println("[Main] Крок 1: Ініціалізація BLE...");
  // Initialize BMS BLE FIRST - must be before WiFi for proper radio initialization on ESP32-S3
  initBMS();
  Serial.println("[Main] BLE ініціалізовано");
  Serial.println("[Main] Крок 2: Ініціалізація WiFi Manager...");

  // Initialize WiFi Manager (after BLE for radio coexistence)
  initWiFiManager();

  // Initialize PSRAM for external RAM access (2MB on Super Mini)
  psramInit();
  Serial.println("[Main] PSRAM ініціалізовано");

  Serial.println("[Main] Крок 3: Ініціалізація дисплея...");

  // Initialize display
  initDisplay();
  Serial.println("[Main] Крок 4: Ініціалізація веб-сервера...");

  // Initialize Web Server
  initWebServer();
  Serial.println("[Main] Крок 5: Завершення налаштувань...");

  Serial.println("[Main] Ініціалізація завершена");

  // Try to auto-connect to last BMS if configured
  if (BMS_MAC.length() > 0 && !bmsConnected) {
    Serial.println("[Main] Спроба автоматичного підключення до BMS...");
    if (connectToBMS(BMS_MAC, BMS_NAME)) {
      Serial.println("[Main] Автоматично підключено до BMS");
    }
  }
}

void loop() {
  // Handle WiFi Manager (AP/STA mode switching)
  handleWiFiManager();

  // Soft WiFi reconnect check (non-blocking)
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastWiFiReconnect = 0;
    if (millis() - lastWiFiReconnect > 15000) {
      lastWiFiReconnect = millis();
      Serial.println("[Main] WiFi не підключено, неблокуюча спроба reconnect...");
      if (wifiSSID.length() > 0) {
        WiFi.disconnect();
        WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());
      } else {
        Serial.println("[Main] Немає збереженої мережі Wi-Fi");
      }
    }
  }

  // Handle Web Server clients
  server.handleClient();

  // Update BMS data every 5 seconds (reduced frequency)
  if (millis() - lastBMSUpdate > BMS_UPDATE_INTERVAL) {
    if (bmsConnected) {
      updateBMSData();
    }
    lastBMSUpdate = millis();
  }

  // Update display every 1 second
  handleDisplay();

  // Handle API data sending
  // handleAPIData();  // Replit вимкнено

  // Auto-reconnect to BMS if configured and disconnected
  static unsigned long lastBMSReconnect = 0;
  if (BMS_MAC.length() > 0 && !bmsConnected &&
      millis() - lastBMSReconnect > 25000) {
    Serial.println("[Main] Спроба автоматичного перепідключення до BMS...");
    if (connectToBMS(BMS_MAC, BMS_NAME)) {
      Serial.println("[Main] Автоматично перепідключено до BMS");
    }
    lastBMSReconnect = millis();
  }

  // Handle restart request
  if (shouldRestart) {
    Serial.println("[Main] Перезапуск за запитом...");
    delay(1000);
    ESP.restart();
  }

  // Yield to allow background WiFi/BLE processing
  yield();

  // Non-blocking delay for CPU load reduction
  static unsigned long lastLoopDelay = 0;
  if (millis() - lastLoopDelay > 50) {
    lastLoopDelay = millis();
  }

  delay(5);
}
`,

  'GLOBAL_STATE.h': `// GLOBAL_STATE.h - Centralized Global State (Header-only, Local Version)
#pragma once

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <BLEDevice.h>
#include <BLEClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>

// BMS Data Structure
struct BMSData {
  float totalVoltage;
  float current;
  float capacityRemaining;
  float capacityTotal;
  uint16_t cycleCount;
  uint8_t soc;
  uint8_t cellCount;
  float cellVoltages[24];
  float temperatures[6];
  uint16_t balanceStatus;
  uint16_t balanceStatusHigh;
  uint16_t protectionStatus;
  uint8_t fetStatus;
  uint8_t softwareVersion;
  uint8_t tempSensorCount;
  String productionDate;
  String hardwareVersion;
};

// BLE Configuration (inline definitions)
inline const BLEUUID SERVICE_UUID("0000ff00-0000-1000-8000-00805f9b34fb");
inline const BLEUUID CHAR_TX_UUID("0000ff01-0000-1000-8000-00805f9b34fb");
inline const BLEUUID CHAR_RX_UUID("0000ff02-0000-1000-8000-00805f9b34fb");

// WiFi Configuration (inline definitions)
inline const char* DEFAULT_AP_PREFIX = "BMS_Setup";
inline const char* DEFAULT_AP_PASSWORD = "12345678";
inline String wifiSSID = "";
inline String wifiPassword = "";
inline bool wifiConfigured = false;
inline bool wifiConnected = false;
inline IPAddress localIP;

// Display State (inline definitions)
inline bool displayDetected = false;
inline bool displayActive = false;

// API Configuration (inline definitions)
inline String apiServer = "https://461983bf-ecc9-4747-8db2-e82b27bd579d-00-1m6pgpxvvfymx-cyebw660.worf.replit.dev/api/bms/push";
inline String deviceId = "bms_001";

// BLE Objects (inline definitions)
inline BLEClient* pClient = nullptr;
inline BLERemoteCharacteristic* pTxCharacteristic = nullptr;
inline BLERemoteCharacteristic* pRxCharacteristic = nullptr;

// BMS State (inline definitions)
inline BMSData bmsData;
inline bool bmsConnected = false;
inline String BMS_MAC = "";
inline String BMS_NAME = "";
inline uint8_t bmsResponse[512];
inline size_t bmsResponseLength = 0;
inline bool newDataReceived = false;
inline String availableBMS[20];
inline int bmsCount = 0;
inline bool isScanning = false;

// BLE fragment buffer for JBD/Xiaoxiang BMS
inline uint8_t bleRxBuffer[64];
inline uint8_t bleRxLen = 0;

// Mutex for protecting BMS data access
inline SemaphoreHandle_t bmsDataMutex = nullptr;

// Timing Variables (inline definitions)
inline unsigned long lastBMSUpdate = 0;
inline unsigned long lastDisplayUpdate = 0;
inline unsigned long lastWiFiCheck = 0;
inline unsigned long wifiConnectStartTime = 0;
inline unsigned long lastReconnectAttempt = 0;

// Constants (inline definitions)
inline const unsigned long BMS_UPDATE_INTERVAL = 5000;
inline const unsigned long DISPLAY_UPDATE_INTERVAL = 3000;
inline const unsigned long WIFI_CONNECT_TIMEOUT = 15000;
inline const unsigned long WIFI_CHECK_INTERVAL = 10000;

// WiFi Manager State (dual-mode AP+STA always active)
inline bool shouldRestart = false;

// API Client State (inline definitions)
inline bool apiSaved = false;

// Function Declarations
void controlMOSFET(uint8_t state);
bool readBasicInfo();
bool readCellVoltages();
bool sendBMSCommand(const uint8_t* cmd, size_t cmdLen, uint32_t timeout = 1000);
bool verifyChecksum(const uint8_t* data, size_t length);
uint16_t jbdChecksum(const uint8_t* data, size_t length);
String decodeProtectionState(uint16_t protectionStatus);

bool startSTAConnection();
bool checkSTAConnection();
bool initAPMode();
void handleWiFiManager();
bool saveWiFiConfig(const String& ssid, const String& password);
void loadWiFiConfig();
void resetWiFiConfig();
String getWiFiStatusString();
bool isWiFiReady();
IPAddress getAPIP();
IPAddress getSTAIP();

bool saveBMSConfig(const String& mac);
void loadBMSConfig();
void resetBMSConfig();

void initWebServer();
void handleRoot();
void handleData();
void handleControl();
void handleScan();
void handleWiFiScan();
void handleConnect();
void handleDisconnect();
void handleDisplayWeb();
void handleBalance();
void handleAutoPoll();
void handleCloudSettings();
void handleCloudSave();
void handleSystem();
void handleSave();
void handleOptions();
void handleNotFound();
`,

  'bms.h': `// bms.h - BMS BLE Communication Module (Header-only)
#pragma once

#include "GLOBAL_STATE.h"
#include <Preferences.h>

class MyAdvertisedDeviceCallbacks : public BLEAdvertisedDeviceCallbacks {
  void onResult(BLEAdvertisedDevice advertisedDevice) {
    String deviceName = advertisedDevice.getName().c_str();
    String deviceAddress = advertisedDevice.getAddress().toString().c_str();
    String displayName = deviceName.length() > 0 ? deviceName : "Unknown_" + deviceAddress.substring(12);
    if (bmsCount < 20) {
      availableBMS[bmsCount] = deviceAddress + "|" + displayName;
      bmsCount++;
    }
  }
};

class MyClientCallback : public BLEClientCallbacks {
  void onConnect(BLEClient* pclient) {}
  void onDisconnect(BLEClient* pclient) {
    bmsConnected = false;
  }
};

inline void notifyCallback(BLERemoteCharacteristic* pBLERemoteCharacteristic,
                    uint8_t* pData, size_t length, bool isNotify) {
  if (bleRxLen == 0 && (length == 0 || pData[0] != 0xDD)) return;
  if (bleRxLen + length > sizeof(bleRxBuffer)) {
    bleRxLen = 0;
    memset(bleRxBuffer, 0, sizeof(bleRxBuffer));
    return;
  }
  memcpy(&bleRxBuffer[bleRxLen], pData, length);
  bleRxLen += length;
  if (bleRxLen >= 7 && bleRxBuffer[bleRxLen - 1] == 0x77) {
    if (bleRxBuffer[0] == 0xDD) {
      memcpy(bmsResponse, bleRxBuffer, bleRxLen);
      bmsResponseLength = bleRxLen;
      newDataReceived = true;
      bleRxLen = 0;
      memset(bleRxBuffer, 0, sizeof(bleRxBuffer));
    } else {
      bleRxLen = 0;
      memset(bleRxBuffer, 0, sizeof(bleRxBuffer));
    }
  }
}

inline uint16_t jbdChecksum(const uint8_t* data, size_t len) {
  uint16_t sum = 0;
  for (size_t i = 0; i < len; i++) {
    sum += data[i];
  }
  return ((~sum) + 1) & 0xFFFF;
}

inline String decodeProtectionState(uint16_t protectionStatus) {
  String result = "";
  if (protectionStatus & 0x0001) result += "Cell OVP, ";
  if (protectionStatus & 0x0002) result += "Cell UVP, ";
  if (protectionStatus & 0x0004) result += "Pack OVP, ";
  if (protectionStatus & 0x0008) result += "Pack UVP, ";
  if (protectionStatus & 0x0010) result += "Over-temp Charge, ";
  if (protectionStatus & 0x0020) result += "Under-temp Charge, ";
  if (protectionStatus & 0x0040) result += "Over-temp Discharge, ";
  if (protectionStatus & 0x0080) result += "Under-temp Discharge, ";
  if (protectionStatus & 0x0100) result += "Over-current Charge, ";
  if (protectionStatus & 0x0200) result += "Over-current Discharge, ";
  if (protectionStatus & 0x0400) result += "Short Circuit, ";
  if (protectionStatus & 0x0800) result += "Front-end IC Error, ";
  if (protectionStatus & 0x1000) result += "MOS Software Lock, ";
  if (result.length() > 2) {
    result = result.substring(0, result.length() - 2);
  }
  return result;
}

inline bool verifyChecksum(const uint8_t* data, size_t length) {
  if (length < 6) return false;
  if (data[length - 1] != 0x77) return false;
  uint16_t receivedChecksum = (data[length - 3] << 8) | data[length - 2];
  uint16_t calculatedChecksum = jbdChecksum(data + 3, length - 6);
  return (calculatedChecksum == receivedChecksum);
}

inline bool sendBMSCommand(uint8_t* cmd, size_t cmdLen, uint32_t timeout) {
  if (!pClient || !pClient->isConnected() || !pRxCharacteristic) return false;
  newDataReceived = false;
  bmsResponseLength = 0;
  memset(bmsResponse, 0, sizeof(bmsResponse));
  bleRxLen = 0;
  memset(bleRxBuffer, 0, sizeof(bleRxBuffer));
  pRxCharacteristic->writeValue(cmd, cmdLen, false);
  uint32_t startTime = millis();
  while (!newDataReceived && (millis() - startTime) < timeout) {
    yield();
  }
  if (!newDataReceived) return false;
  delay(100);
  return verifyChecksum(bmsResponse, bmsResponseLength);
}

inline bool readBasicInfo() {
  uint8_t cmd[] = {0xDD, 0xA5, 0x03, 0x00, 0xFF, 0xFD, 0x77};
  if (!sendBMSCommand(cmd, sizeof(cmd), 350)) return false;
  if (bmsResponseLength < 0x1D) return false;
  if (bmsDataMutex != nullptr && xSemaphoreTake(bmsDataMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
    bmsData.totalVoltage = ((bmsResponse[4] << 8) | bmsResponse[5]) / 100.0;
    bmsData.current = (int16_t)((bmsResponse[6] << 8) | bmsResponse[7]) / 100.0;
    bmsData.capacityRemaining = ((bmsResponse[8] << 8) | bmsResponse[9]) / 100.0;
    bmsData.capacityTotal = ((bmsResponse[10] << 8) | bmsResponse[11]) / 100.0;
    bmsData.cycleCount = (bmsResponse[12] << 8) | bmsResponse[13];
    bmsData.productionDate = String("20") + String(bmsResponse[14]) + "/" + String(bmsResponse[15]) + "/" + String(bmsResponse[16]);
    bmsData.balanceStatus = (bmsResponse[17] << 8) | bmsResponse[18];
    bmsData.balanceStatusHigh = (bmsResponse[19] << 8) | bmsResponse[20];
    bmsData.protectionStatus = (bmsResponse[20] << 8) | bmsResponse[21];
    bmsData.softwareVersion = bmsResponse[22];
    bmsData.soc = bmsResponse[23];
    bmsData.fetStatus = bmsResponse[24];
    bmsData.cellCount = bmsResponse[25];
    bmsData.tempSensorCount = bmsResponse[26];
    for (int i = 0; i < bmsData.tempSensorCount && i < 6; i++) {
      uint16_t tempRaw = (bmsResponse[27 + i * 2] << 8) | bmsResponse[27 + i * 2 + 1];
      bmsData.temperatures[i] = (tempRaw - 2731) / 10.0;
    }
    for (int i = bmsData.tempSensorCount; i < 6; i++) {
      bmsData.temperatures[i] = 0;
    }
    xSemaphoreGive(bmsDataMutex);
  } else {
    return false;
  }
  yield();
  return true;
}

inline bool readCellVoltages() {
  uint8_t cmd[] = {0xDD, 0xA5, 0x04, 0x00, 0xFF, 0xFC, 0x77};
  if (!sendBMSCommand(cmd, sizeof(cmd), 350)) return false;
  uint8_t cellsInPacket = bmsResponse[3] / 2;
  size_t expectedLength = 4 + (cellsInPacket * 2) + 2;
  if (bmsResponseLength < expectedLength) return false;
  if (bmsDataMutex != nullptr && xSemaphoreTake(bmsDataMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
    for (int i = 0; i < cellsInPacket && i < 24; i++) {
      uint16_t voltage = (bmsResponse[4 + i * 2] << 8) | bmsResponse[4 + i * 2 + 1];
      bmsData.cellVoltages[i] = voltage / 1000.0;
    }
    bmsData.cellCount = cellsInPacket;
    xSemaphoreGive(bmsDataMutex);
  } else {
    return false;
  }
  yield();
  return true;
}

inline void controlMOSFET(uint8_t state) {
  uint8_t cmd[] = {0xDD, 0xA5, 0x94, 0x01, state, 0x00, 0x77};
  uint16_t checksum = jbdChecksum(cmd, 5);
  cmd[5] = (checksum >> 8) & 0xFF;
  cmd[6] = checksum & 0xFF;
  sendBMSCommand(cmd, sizeof(cmd), 1000);
}

inline void initBMS() {
  memset(&bmsData, 0, sizeof(bmsData));
  BLEDevice::init("BMS-Controller");
  Preferences prefs;
  prefs.begin("bms_app", true);
  BMS_MAC = prefs.getString("bms_mac", "");
  BMS_NAME = prefs.getString("name", "");
  prefs.end();
}

inline bool connectToBMS(const String& mac, const String& name) {
  if (mac.length() == 0) return false;
  BLEAddress address(mac.c_str());
  if (!pClient) {
    pClient = BLEDevice::createClient();
    pClient->setClientCallbacks(new MyClientCallback());
  }
  if (pClient->isConnected()) pClient->disconnect();
  if (!pClient->connect(address)) return false;
  BLERemoteService* pRemoteService = pClient->getService(SERVICE_UUID);
  if (!pRemoteService) {
    pClient->disconnect();
    return false;
  }
  pTxCharacteristic = pRemoteService->getCharacteristic(CHAR_TX_UUID);
  pRxCharacteristic = pRemoteService->getCharacteristic(CHAR_RX_UUID);
  if (!pTxCharacteristic || !pRxCharacteristic) {
    pClient->disconnect();
    return false;
  }
  if (pTxCharacteristic->canNotify()) {
    pTxCharacteristic->registerForNotify(notifyCallback);
  }
  bmsConnected = true;
  BMS_MAC = mac;
  BMS_NAME = name;
  Preferences prefs;
  prefs.begin("bms_app", false);
  prefs.putString("bms_mac", mac);
  prefs.putString("name", name);
  prefs.end();
  return true;
}

inline void disconnectBMS() {
  if (pClient) {
    pClient->disconnect();
    bmsConnected = false;
  }
}

inline bool updateBMSData() {
  if (!bmsConnected) return false;
  if (!readBasicInfo()) return false;
  delay(100);
  yield();
  if (!readCellVoltages()) return false;
  yield();
  return true;
}
`,

  'display.h': `// display.h — ST7789 240×320 Display Module
#pragma once
#include "lgfx_config.h"
#include <WiFi.h>
#include "GLOBAL_STATE.h"

#define C_BG       0x0841
#define C_SUR      0x1082
#define C_SUR2     0x18A3
#define C_BRD      0x2965
#define C_ACCENT   0x07FF
#define C_GREEN    0x07E0
#define C_GREEN2   0x3666
#define C_YELLOW   0xFD20
#define C_RED      0xF800
#define C_BLUE     0x001F
#define C_WHITE    0xFFFF
#define C_LGRAY    0xAD75
#define C_GRAY     0x6B6D
#define C_DGRAY    0x2965

#define SCRW        240
#define SCRH        320
#define HDR_H        28
#define FTR_H        26
#define CTX_Y       HDR_H
#define CTX_H       (SCRH - HDR_H - FTR_H)

static LGFX _tft;
static uint8_t   _pg        = 0;
static uint8_t   _PG_CNT    = 3;
static uint32_t  _pgTimer   = 0;
static uint32_t  _PG_MS     = 7000;
static uint32_t  _drawTimer = 0;
static uint32_t  _DRAW_MS   = 1000;
static uint8_t   _brt       = 220;
static bool      _inited    = false;
static const char* _pgNames[3] = { "Dashboard", "Cell V", "Status" };

static inline uint16_t _socClr(uint8_t s) {
  if (s < 15) return C_RED;
  if (s < 30) return C_YELLOW;
  return C_GREEN2;
}

static inline uint16_t _tmpClr(float t) {
  if (t > 50) return C_RED;
  if (t > 40) return C_YELLOW;
  if (t <  5) return C_BLUE;
  return C_GREEN2;
}

static inline float _clamp(float v, float lo, float hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

static void _bar(int16_t x, int16_t y, int16_t w, int16_t h, float pct, uint16_t fill, uint16_t bg, uint16_t brd) {
  _tft.drawRect(x, y, w, h, brd);
  int16_t fw = (int16_t)((w-2) * _clamp(pct, 0.0f, 1.0f));
  if (fw > 0)   _tft.fillRect(x+1,    y+1, fw,      h-2, fill);
  if (fw < w-2) _tft.fillRect(x+1+fw, y+1, w-2-fw, h-2, bg);
}

static void _dot(int16_t cx, int16_t cy, int16_t r, bool on) {
  _tft.fillCircle(cx, cy, r,   on ? C_GREEN : C_RED);
  _tft.drawCircle(cx, cy, r+1, on ? C_GREEN2: C_RED);
}

static void _hdr(const char* title) {
  _tft.fillRect(0, 0, SCRW, HDR_H, C_SUR);
  _tft.drawFastHLine(0, HDR_H-1, SCRW, C_BRD);
  _tft.setTextColor(C_ACCENT, C_SUR);
  _tft.setTextDatum(ML_DATUM);
  _tft.setTextFont(2);
  _tft.drawString(title, 8, HDR_H/2+1);
  _dot(SCRW-38, HDR_H/2, 4, wifiConnected);
  _tft.setTextFont(1);
  _tft.setTextColor(C_GRAY, C_SUR);
  _tft.setTextDatum(ML_DATUM);
  _tft.drawString("W", SCRW-31, HDR_H/2+1);
  _dot(SCRW-18, HDR_H/2, 4, bmsConnected);
  _tft.drawString("B", SCRW-11, HDR_H/2+1);
}

static void _ftr(uint8_t pg) {
  int16_t fy = SCRH - FTR_H;
  _tft.fillRect(0, fy, SCRW, FTR_H, C_SUR);
  _tft.drawFastHLine(0, fy, SCRW, C_BRD);
  int16_t dx = SCRW/2 - (_PG_CNT*12)/2;
  for (uint8_t i=0; i<_PG_CNT; i++) {
    bool act = (i==pg);
    _tft.fillCircle(dx+i*12, fy+FTR_H/2, act?5:3, act?C_ACCENT:C_DGRAY);
  }
  _tft.setTextFont(1);
  _tft.setTextColor(C_GRAY, C_SUR);
  _tft.setTextDatum(MR_DATUM);
  _tft.drawString(_pgNames[pg], SCRW-6, fy+FTR_H/2+1);
  uint32_t el = millis() - _pgTimer;
  float rem = 1.0f - _clamp((float)el/_PG_MS, 0.0f, 1.0f);
  _tft.fillRect(4, fy+FTR_H/2-2, 32, 4, C_BRD);
  int16_t bfw = (int16_t)(32*rem);
  if (bfw>0) _tft.fillRect(4, fy+FTR_H/2-2, bfw, 4, C_ACCENT);
}

static void _pg0() {
  uint8_t  soc   = bmsData.soc;
  float    volt  = bmsData.totalVoltage;
  float    curr  = bmsData.current;
  bool     isChg = (curr < -0.05f);
  float    pwr   = fabsf(volt * curr);
  float    capR  = bmsData.capacityRemaining;
  float    capT  = bmsData.capacityTotal;
  uint16_t sc    = _socClr(soc);
  char     buf[24];

  int16_t y0 = CTX_Y;
  _tft.fillRect(0, y0, SCRW, 65, C_BG);
  snprintf(buf, sizeof(buf), "%d%%", soc);
  _tft.setTextFont(6);
  _tft.setTextColor(sc, C_BG);
  _tft.setTextDatum(MC_DATUM);
  _tft.drawString(buf, 58, y0+28);

  snprintf(buf, sizeof(buf), "%.1f / %.1f Ah", capR, capT);
  _tft.setTextFont(1);
  _tft.setTextColor(C_GRAY, C_BG);
  _tft.setTextDatum(MC_DATUM);
  _tft.drawString(buf, 58, y0+56);

  _bar(126, y0+8, 108, 22, soc/100.0f, sc, C_SUR2, C_BRD);
  snprintf(buf, sizeof(buf), "%s %.2fA", isChg?"<":">", fabsf(curr));
  _tft.setTextFont(1);
  _tft.setTextColor(isChg?C_GREEN:C_YELLOW, C_BG);
  _tft.setTextDatum(ML_DATUM);
  _tft.drawString(buf, 127, y0+45);
  _tft.drawFastHLine(0, y0+65, SCRW, C_BRD);

  int16_t mY = y0+66, hw = SCRW/2;
  float M_v[4] = {volt, fabsf(curr), pwr, (float)bmsData.cycleCount};
  const char* M_lbl[4] = {"НАПРУГА", isChg?"ЗАРЯД":"РОЗРЯД", "ПОТУЖНІСТЬ", "ЦИКЛИ"};
  const char* M_u[4] = {"В", "А", "Вт", "шт"};
  uint16_t M_col[4] = {C_ACCENT, C_YELLOW, C_GREEN2, C_GRAY};

  for (uint8_t i=0; i<4; i++) {
    int16_t mx = (i%2)*hw, my = mY+(i/2)*40;
    _tft.fillRect(mx, my, hw, 40, C_BG);
    if (i%2==1) _tft.drawFastVLine(mx, my, 40, C_BRD);
    if (i/2==1) _tft.drawFastHLine(mx, my, hw, C_BRD);
    snprintf(buf, sizeof(buf), i==3?"%.0f":"%.2f", M_v[i]);
    _tft.setTextFont(4);
    _tft.setTextColor(M_col[i], C_BG);
    _tft.setTextDatum(ML_DATUM);
    _tft.drawString(buf, mx+5, my+14);
    _tft.setTextFont(1);
    _tft.setTextColor(C_DGRAY, C_BG);
    _tft.setTextDatum(MR_DATUM);
    _tft.drawString(M_u[i], mx+hw-3, my+8);
    _tft.setTextColor(C_GRAY, C_BG);
    _tft.setTextDatum(ML_DATUM);
    _tft.drawString(M_lbl[i], mx+5, my+33);
  }
  _tft.drawFastHLine(0, mY+80, SCRW, C_BRD);
}

static void _pg1() {
  _tft.fillRect(0, CTX_Y, SCRW, CTX_H, C_BG);
  uint8_t n = bmsData.cellCount;
  if (!bmsConnected || n==0) {
    _tft.setTextFont(2); _tft.setTextColor(C_GRAY, C_BG);
    _tft.setTextDatum(MC_DATUM);
    _tft.drawString("BMS не підключено", SCRW/2, CTX_Y+CTX_H/2);
    return;
  }
  if (n>24) n=24;
  float mnV=bmsData.cellVoltages[0], mxV=mnV;
  for(uint8_t i=1;i<n;i++){
    if(bmsData.cellVoltages[i]<mnV) mnV=bmsData.cellVoltages[i];
    if(bmsData.cellVoltages[i]>mxV) mxV=bmsData.cellVoltages[i];
  }
  float rng=mxV-mnV; if(rng<0.001f) rng=0.001f;
  char sbuf[36];
  snprintf(sbuf, sizeof(sbuf), "min%.3f  max%.3f", mnV, mxV);
  _tft.setTextFont(1); _tft.setTextColor(C_GRAY, C_BG);
  _tft.setTextDatum(MC_DATUM);
  _tft.drawString(sbuf, SCRW/2, CTX_Y+8);
  _tft.drawFastHLine(0, CTX_Y+16, SCRW, C_BRD);
}

static void _pg2() {
  _tft.fillRect(0, CTX_Y, SCRW, CTX_H, C_BG);
  int16_t cy = CTX_Y+2;
  _tft.setTextFont(1);
  _tft.setTextColor(C_ACCENT, C_BG);
  _tft.drawString(wifiConnected ? "WiFi: Connected" : "WiFi: Disconnected", 6, cy);
  cy += 20;
  _tft.drawString(bmsConnected ? "BMS: Connected" : "BMS: Disconnected", 6, cy);
}

static void _splash() {
  _tft.fillScreen(C_BG);
  _tft.setTextFont(4); _tft.setTextColor(C_ACCENT, C_BG);
  _tft.setTextDatum(MC_DATUM);
  _tft.drawString("JBD BMS", SCRW/2, SCRH/2-20);
}

inline bool initDisplay() {
  _tft.init();
  _tft.setRotation(0);
  _tft.fillScreen(C_BG);
  _tft.setBrightness(_brt);
  displayDetected = true;
  displayActive   = true;
  _splash();
  _inited = true;
  return true;
}

inline void handleDisplay() {
  if (!_inited || !displayDetected || !displayActive) return;
  uint32_t now = millis();
  if (now - _pgTimer >= _PG_MS) {
    _pg = (_pg+1) % _PG_CNT;
    _pgTimer = now;
    _drawTimer = 0;
  }
  if (now - _drawTimer < _DRAW_MS) return;
  _drawTimer = now;
  switch (_pg) {
    case 0: _hdr("JBD BMS"); _pg0(); break;
    case 1: _hdr("Cells"); _pg1(); break;
    case 2: _hdr("Status"); _pg2(); break;
  }
  _ftr(_pg);
  yield();
}

inline void nextDisplayPage() {
  _pg = (_pg+1) % _PG_CNT;
  _pgTimer = millis();
  _drawTimer = 0;
}

inline void setDisplayBrightness(uint8_t brt) {
  _brt = brt;
  _tft.setBrightness(brt);
}

inline void setDisplayPower(bool on) {
  displayActive = on;
  _tft.setBrightness(on ? _brt : 0);
  if (!on) _tft.fillScreen(C_BG);
}
`,

  'lgfx_config.h': `// lgfx_config.h - LovyanGFX конфігурація дисплею ST7789 240x320
#pragma once
#include <LovyanGFX.hpp>

class LGFX : public lgfx::LGFX_Device {
  lgfx::Panel_ST7789  _panel;
  lgfx::Bus_SPI       _bus;
  lgfx::Light_PWM     _light;

public:
  LGFX() {
    {
      auto cfg = _bus.config();
      cfg.spi_host    = SPI2_HOST;
      cfg.spi_mode    = 0;
      cfg.freq_write  = 40000000;
      cfg.freq_read   = 16000000;
      cfg.spi_3wire   = false;
      cfg.use_lock    = true;
      cfg.dma_channel = SPI_DMA_CH_AUTO;
      cfg.pin_sclk    = 13;
      cfg.pin_mosi    = 12;
      cfg.pin_miso    = -1;
      cfg.pin_dc      = 10;
      _bus.config(cfg);
      _panel.setBus(&_bus);
    }
    {
      auto cfg = _panel.config();
      cfg.pin_cs           =  9;
      cfg.pin_rst          = 11;
      cfg.pin_busy         = -1;
      cfg.memory_width     = 240;
      cfg.memory_height    = 320;
      cfg.panel_width      = 240;
      cfg.panel_height     = 320;
      cfg.invert           = true;
      _panel.config(cfg);
    }
    {
      auto cfg = _light.config();
      cfg.pin_bl      = -1;
      cfg.invert      = false;
      cfg.freq        = 12000;
      cfg.pwm_channel = 0;
      _light.config(cfg);
      _panel.setLight(&_light);
    }
    setPanel(&_panel);
  }
};
`,

  'web_server.h': `// web_server.h — Web Server Module (Header-only)
#pragma once

#include <WebServer.h>
#include <Update.h>
#include "GLOBAL_STATE.h"
#include "display.h"
#include "html_page.h"

inline WebServer server(80);

inline void handleRoot() {
  Serial.println("[Web] GET /");
  server.send_P(200, "text/html", HTML_PAGE);
  Serial.println("[Web] Sent main HTML page");
}

inline String sanitizeJsonString(const String& input) {
  String output;
  output.reserve(input.length());
  for (size_t i = 0; i < input.length(); i++) {
    char c = input.charAt(i);
    if (c < 0x20 && c != '\\t' && c != '\\n' && c != '\\r') {
      continue;
    }
    output += c;
  }
  return output;
}

inline void handleData() {
  Serial.println("[Web] GET /data");
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");

  static StaticJsonDocument<4096> doc;
  doc.clear();

  if (bmsDataMutex != nullptr && xSemaphoreTake(bmsDataMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
    doc["wifiConnected"]  = wifiConnected;
    doc["wifiInfo"]       = wifiConnected ? localIP.toString() : "";
    doc["bmsConnected"]   = bmsConnected;
    doc["bmsInfo"]        = bmsConnected ? sanitizeJsonString(BMS_NAME) : "";
    doc["displayActive"]  = displayActive;
    doc["displayDetected"]= displayDetected;

    if (!bmsConnected) {
      bmsData.totalVoltage = 0.0;
      bmsData.current = 0.0;
      bmsData.soc = 0;
      bmsData.cellCount = 0;
      bmsData.tempSensorCount = 0;
      bmsData.protectionStatus = 0;
      bmsData.balanceStatus = 0;
      bmsData.balanceStatusHigh = 0;
      bmsData.fetStatus = 0;
      bmsData.capacityRemaining = 0.0;
      bmsData.capacityTotal = 0.0;
      bmsData.cycleCount = 0;
      bmsData.softwareVersion = 0;
      memset(bmsData.cellVoltages, 0, sizeof(bmsData.cellVoltages));
      memset(bmsData.temperatures, 0, sizeof(bmsData.temperatures));
      bmsData.productionDate = "";
      bmsData.hardwareVersion = "";
    }

    doc["voltage"]        = bmsData.totalVoltage;
    doc["current"]        = bmsData.current;
    doc["soc"]            = bmsData.soc;
    doc["capacity"]       = bmsData.capacityRemaining;
    doc["totalCapacity"]  = bmsData.capacityTotal;
    doc["cellCount"]      = bmsData.cellCount;
    doc["fetStatus"]      = bmsData.fetStatus;
    doc["cycleCount"]     = bmsData.cycleCount;
    doc["tempSensorCount"]= bmsData.tempSensorCount;
    doc["balanceStatus"]  = bmsData.balanceStatus;
    doc["balanceStatusHigh"] = bmsData.balanceStatusHigh;
    doc["protectionStatus"]  = bmsData.protectionStatus;
    doc["protectionDecoded"] = sanitizeJsonString(decodeProtectionState(bmsData.protectionStatus));
    if (!bmsConnected) {
      doc["protectionDecoded"] = "BMS DISCONNECTED";
    }
    doc["softwareVersion"]   = sanitizeJsonString(String(bmsData.softwareVersion));
    doc["productionDate"]    = sanitizeJsonString(bmsData.productionDate);

    if (bmsConnected && bmsData.tempSensorCount > 0) {
      JsonArray temps = doc.createNestedArray("temperatures");
      for (uint8_t i = 0; i < bmsData.tempSensorCount && i < 6; i++) {
        temps.add(bmsData.temperatures[i]);
      }
    }

    if (bmsConnected && bmsData.cellCount > 0) {
      JsonArray cells = doc.createNestedArray("cellVoltages");
      for (uint8_t i = 0; i < bmsData.cellCount && i < 24; i++) {
        cells.add(bmsData.cellVoltages[i]);
      }
    }

    xSemaphoreGive(bmsDataMutex);
  } else {
    doc["wifiConnected"]  = wifiConnected;
    doc["wifiInfo"]       = wifiConnected ? localIP.toString() : "";
    doc["bmsConnected"]   = false;
    doc["bmsInfo"]        = "";
    doc["displayActive"]  = displayActive;
    doc["displayDetected"]= displayDetected;
  }

  unsigned long totalSeconds = millis() / 1000;
  unsigned long hours = totalSeconds / 3600;
  unsigned long minutes = (totalSeconds % 3600) / 60;
  unsigned long seconds = totalSeconds % 60;
  char uptime_str[32];
  sprintf(uptime_str, "%lu год, %lu хв, %lu сек", hours, minutes, seconds);
  doc["espUptime"] = uptime_str;

  doc["espHeap"]        = ESP.getFreeHeap();
  doc["espTotalHeap"]   = ESP.getHeapSize();

  if (ESP.getPsramSize() > 0) {
    doc["espTotalPsram"]  = ESP.getPsramSize();
    doc["espFreePsram"]   = ESP.getFreePsram();
  } else {
    doc["espTotalPsram"]  = 0;
    doc["espFreePsram"]   = 0;
  }

  doc["espCpuFreq"]     = ESP.getCpuFreqMHz();
  doc["espTemp"]        = temperatureRead();
  doc["flashSize"]      = ESP.getFlashChipSize();

  if (wifiConnected) {
    doc["wifiRssi"]     = WiFi.RSSI();
  }
  doc["apClients"]      = WiFi.softAPgetStationNum();

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

inline void handleApiData() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");

  StaticJsonDocument<4096> doc;

  if (bmsDataMutex != nullptr && xSemaphoreTake(bmsDataMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
    doc["device_name"] = bmsConnected ? sanitizeJsonString(BMS_NAME) : "ESP32-BMS";
    doc["total_voltage"] = bmsData.totalVoltage;
    doc["current"] = bmsData.current;
    doc["power"] = bmsData.totalVoltage * bmsData.current;
    doc["soc"] = bmsData.soc;
    doc["remaining_capacity"] = bmsData.capacityRemaining;
    doc["nominal_capacity"] = bmsData.capacityTotal;
    doc["cycle_count"] = bmsData.cycleCount;

    if (bmsConnected && bmsData.tempSensorCount > 0) {
      JsonArray temps = doc.createNestedArray("temperatures");
      for (uint8_t i = 0; i < bmsData.tempSensorCount && i < 6; i++) {
        temps.add(bmsData.temperatures[i]);
      }
    }

    if (bmsConnected && bmsData.cellCount > 0) {
      JsonArray cells = doc.createNestedArray("cell_voltages");
      for (uint8_t i = 0; i < bmsData.cellCount && i < 24; i++) {
        cells.add(bmsData.cellVoltages[i]);
      }
    }

    xSemaphoreGive(bmsDataMutex);
  } else {
    doc["device_name"] = "ESP32-BMS";
    doc["total_voltage"] = 0;
    doc["current"] = 0;
    doc["power"] = 0;
    doc["soc"] = 0;
    doc["remaining_capacity"] = 0;
    doc["nominal_capacity"] = 0;
    doc["cycle_count"] = 0;
  }

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

inline void initWebServer() {
  server.on("/",           HTTP_GET,  handleRoot);
  server.on("/data",       HTTP_GET,  handleData);
  server.on("/api/data",   HTTP_GET,  handleApiData);
  server.begin();
}
`,

  'html_page.h': `// html_page.h - Embedded Web UI
#pragma once
const char HTML_PAGE[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html>
<head><title>ESP32 BMS Controller</title></head>
<body><h1>ESP32 JBD BMS Controller</h1></body>
</html>
)rawliteral";
`,

  'wifi_manager.h': `// wifi_manager.h - Smart WiFi Manager Module
#pragma once
#include "GLOBAL_STATE.h"
#include <Preferences.h>

inline Preferences preferences;

inline void loadWiFiConfig() {
  preferences.begin("bms_app", true);
  wifiSSID = preferences.getString("ssid", "");
  wifiPassword = preferences.getString("pass", "");
  wifiConfigured = wifiSSID.length() > 0;
  preferences.end();
}

inline void initWiFiManager() {
  loadWiFiConfig();
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP("ESP32_BMS_AP", "12345678");
  localIP = WiFi.softAPIP();
  if (wifiConfigured) {
    WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());
  }
}

inline void handleWiFiManager() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!wifiConnected) {
      wifiConnected = true;
      localIP = WiFi.localIP();
    }
  } else {
    wifiConnected = false;
  }
}
`,

  'api_client.h': `// api_client.h - BMS Data Push Module
#pragma once
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <WiFi.h>
#include "GLOBAL_STATE.h"

inline void handleAPIData() {
  // Replit disabled
}
`,
};
