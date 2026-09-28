// api_client.h - Supabase BMS Data Push Client
#pragma once

#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <WiFi.h>
#include "GLOBAL_STATE.h"

// Timing
const unsigned long API_UPDATE_INTERVAL = 30000; // 30 секунд
unsigned long lastAPISend = 0;

// Push BMS data to Supabase REST
inline void pushBMSData() {
  if (!wifiConnected || !bmsConnected) {
    Serial.println("[API] WiFi або BMS не підключено, пропуск відправки");
    return;
  }

  if (apiServer.length() == 0 || clientId.length() == 0) {
    Serial.println("[API] apiServer або clientId порожні, відправка у хмару вимкнена");
    return;
  }

  HTTPClient http;
  http.setTimeout(10000);

  String url = apiServer;
  WiFiClientSecure client;
  client.setInsecure();

  if (http.begin(client, url)) {
    // Supabase REST headers
    http.addHeader("Content-Type", "application/json");
    if (apiKey.length() > 0) {
      http.addHeader("apikey", apiKey);
      http.addHeader("Authorization", String("Bearer ") + apiKey);
    }
    http.addHeader("Prefer", "return=minimal");

    // Формуємо JSON
    StaticJsonDocument<2048> doc;
    doc["client_id"] = clientId;
    doc["device_id"] = deviceId;
    doc["device_name"] = bmsConnected && BMS_NAME.length() > 0 ? BMS_NAME : deviceId;
    doc["total_voltage"] = bmsData.totalVoltage;
    doc["current"] = bmsData.current;
    doc["power"] = bmsData.totalVoltage * bmsData.current;
    doc["soc"] = bmsData.soc;
    doc["remaining_capacity"] = bmsData.capacityRemaining;
    doc["nominal_capacity"] = bmsData.capacityTotal;
    doc["cycle_count"] = bmsData.cycleCount;

    // Температури
    if (bmsData.tempSensorCount > 0) {
      JsonArray temps = doc.createNestedArray("temperatures");
      for (uint8_t i = 0; i < bmsData.tempSensorCount && i < 6; i++) {
        temps.add(bmsData.temperatures[i]);
      }
    }

    // Напруги комірок
    if (bmsData.cellCount > 0) {
      JsonArray cells = doc.createNestedArray("cell_voltages");
      for (uint8_t i = 0; i < bmsData.cellCount && i < 24; i++) {
        cells.add(bmsData.cellVoltages[i]);
      }
    }

    String jsonString;
    serializeJson(doc, jsonString);

    Serial.printf("[API] Відправка в Supabase (%s): %s\n", url.c_str(), jsonString.c_str());

    int httpCode = http.POST(jsonString);

    if (httpCode > 0) {
      if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED || httpCode == 204) {
        Serial.printf("[API] Дані успішно надіслано в Supabase, код: %d\n", httpCode);
      } else {
        Serial.printf("[API] Помилка Supabase, код: %d\n", httpCode);
        String response = http.getString();
        Serial.printf("[API] Відповідь: %s\n", response.c_str());
      }
    } else {
      Serial.printf("[API] Помилка відправки: %s\n", http.errorToString(httpCode).c_str());
    }

    http.end();
  } else {
    Serial.println("[API] Не вдалося ініціалізувати HTTPS-з'єднання з Supabase");
  }
}

// Автоматична відправка даних
inline void handleAPIData() {
  if (millis() - lastAPISend > API_UPDATE_INTERVAL) {
    if (wifiConnected && bmsConnected && apiServer.length() > 0 && clientId.length() > 0) {
      Serial.println("[API] Періодична відправка телеметрії в хмару...");
      pushBMSData();
    }
    lastAPISend = millis();
  }
}

// Тестове підключення
inline void testAPIServer() {
  HTTPClient http;
  WiFiClientSecure client;
  client.setInsecure();
  if (http.begin(client, apiServer)) {
    if (apiKey.length() > 0) {
      http.addHeader("apikey", apiKey);
    }
    int httpCode = http.GET();
    if (httpCode > 0) {
      Serial.printf("[API] Сервер доступний, код: %d\n", httpCode);
    } else {
      Serial.printf("[API] Сервер недоступний: %s\n", http.errorToString(httpCode).c_str());
    }
    http.end();
  } else {
    Serial.println("[API] Помилка підключення до сервера");
  }
}
