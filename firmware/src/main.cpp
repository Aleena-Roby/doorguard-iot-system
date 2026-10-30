#include <Arduino.h>
#include <WiFi.h>
#include <WiFiMulti.h>
#include <WiFiClientSecure.h>
#include <WebServer.h>
#include <Preferences.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#if __has_include("config.h")
  #include "config.h"
#else
  #include "config.example.h"
#endif

// =====================================================================
// Global State & Configuration
// =====================================================================

// Override weak function in cores/esp32/main.cpp to expand loopTask stack from 8KB to 16KB
size_t getArduinoLoopTaskStackSize(void) {
    return 16384;
}

Preferences preferences;
WebServer server(80);
WiFiMulti wifiMulti;
static WiFiClientSecure secureClient;

String wifiSsid = "";
String wifiPassword = "";
String backendUrl = DEFAULT_BACKEND_URL;
String deviceId = DEVICE_ID;
String lastConnectedSsid = "";

bool isApMode = false;
unsigned long apStartTime = 0;

enum DoorState {
    STATE_UNKNOWN,
    STATE_CLOSED,
    STATE_OPEN
};

DoorState currentDoorState = STATE_UNKNOWN;
DoorState lastSyncedDoorState = STATE_UNKNOWN;
int lastRawPinReading = -1;
unsigned long lastDebounceTime = 0;
unsigned long lastStateChangeTime = 0;
unsigned long lastCloseEventTime = 0;

unsigned long lastHeartbeatTime = 0;
unsigned long lastWifiCheckTime = 0;
unsigned long sequenceNumber = 0;

// =====================================================================
// Sensor Logic
// =====================================================================

const char* doorStateToString(DoorState state) {
    switch (state) {
        case STATE_OPEN: return "OPEN";
        case STATE_CLOSED: return "CLOSED";
        default: return "UNKNOWN";
    }
}

DoorState readSensorState() {
    int raw = digitalRead(REED_SWITCH_PIN);
    #if REED_SWITCH_ACTIVE_LOW
        return (raw == LOW) ? STATE_CLOSED : STATE_OPEN;
    #else
        return (raw == HIGH) ? STATE_CLOSED : STATE_OPEN;
    #endif
}

// =====================================================================
// Onboard Status LED Controller (GPIO 2)
// =====================================================================
#ifdef STATUS_LED_PIN
unsigned long lastLedToggleTime = 0;
bool ledState = false;

void updateStatusLed() {
    unsigned long currentMillis = millis();

    // 1. If Door/Gate is OPEN: Steady slow pulse (every 500 ms) to prevent high-frequency pin crosstalk
    if (currentDoorState == STATE_OPEN) {
        if (currentMillis - lastLedToggleTime >= 500) {
            lastLedToggleTime = currentMillis;
            ledState = !ledState;
            digitalWrite(STATUS_LED_PIN, ledState ? HIGH : LOW);
        }
        return;
    }

    // 2. If Wi-Fi is Disconnected or in Setup AP Mode: Moderate Blink (every 400 ms)
    if (WiFi.status() != WL_CONNECTED || isApMode) {
        if (currentMillis - lastLedToggleTime >= 400) {
            lastLedToggleTime = currentMillis;
            ledState = !ledState;
            digitalWrite(STATUS_LED_PIN, ledState ? HIGH : LOW);
        }
        return;
    }

    // 3. Connected to Wi-Fi & Door is CLOSED: Solid ON (Normal Secured State)
    digitalWrite(STATUS_LED_PIN, HIGH);
}
#endif

// =====================================================================
// Dynamic Multi-WiFi Network Mapping
// =====================================================================

void updateNetworkSettings() {
    String currentSsid = WiFi.SSID();
    Serial.printf("\n[WiFi] Connected to: %s\n", currentSsid.c_str());
    Serial.printf("[WiFi] Assigned IP: %s | Signal: %d dBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());

    // Search for matching network in KNOWN_NETWORKS to set server IP
    for (size_t i = 0; i < NUM_KNOWN_NETWORKS; i++) {
        if (currentSsid.equals(KNOWN_NETWORKS[i].ssid)) {
            if (KNOWN_NETWORKS[i].backendUrl != nullptr && strlen(KNOWN_NETWORKS[i].backendUrl) > 0) {
                backendUrl = KNOWN_NETWORKS[i].backendUrl;
                Serial.printf("[Config] Auto-matched Backend Server: %s\n", backendUrl.c_str());
                return;
            }
        }
    }

    // Fall back to NVS saved URL or default
    preferences.begin("doorguard", true);
    backendUrl = preferences.getString("url", DEFAULT_BACKEND_URL);
    preferences.end();
    Serial.printf("[Config] Using Fallback Server URL: %s\n", backendUrl.c_str());
}

// =====================================================================
// HTTP Client Methods (Standard ESP32 HTTPClient with Keep-Alive & Chunked Support)
// =====================================================================

static HTTPClient httpClient;

int executePost(const char* endpoint, const JsonDocument& doc) {
    if (WiFi.status() != WL_CONNECTED || isApMode) {
        return -1;
    }

    String jsonString;
    serializeJson(doc, jsonString);
    String fullUrl = backendUrl + String(endpoint);

    secureClient.setInsecure();
    httpClient.setReuse(true);
    httpClient.setTimeout(4000);

    if (!httpClient.begin(secureClient, fullUrl)) {
        Serial.printf("[HTTP] Failed to connect to %s\n", fullUrl.c_str());
        return -1;
    }
    httpClient.addHeader("Content-Type", "application/json");

    int httpCode = httpClient.POST(jsonString);

    if (httpCode > 0) {
        // Automatically decodes chunked transfer encoding and drains body cleanly
        String resp = httpClient.getString();
    } else {
        Serial.printf("[HTTP] POST error: %s (%d)\n", httpClient.errorToString(httpCode).c_str(), httpCode);
        httpClient.end();
    }

    return httpCode;
}

bool sendDoorEvent(DoorState state) {
    sequenceNumber++;

    JsonDocument doc;
    doc["device_id"] = deviceId;
    doc["state"] = doorStateToString(state);
    doc["source"] = "ESP32";
    doc["sequence_number"] = sequenceNumber;

    unsigned long t0 = millis();
    Serial.printf("[DoorGuard] >>> SENSOR STATE CHANGE: %s (Seq: %lu) <<<\n",
                  doorStateToString(state), sequenceNumber);

    String jsonString;
    serializeJson(doc, jsonString);

    // 1. Ultra-fast direct dispatch to Supabase REST API in Mumbai (~180ms latency)
    #ifdef SUPABASE_REST_URL
    secureClient.setInsecure();
    httpClient.setReuse(true);
    httpClient.setTimeout(2500);

    if (httpClient.begin(secureClient, SUPABASE_REST_URL)) {
        httpClient.addHeader("apikey", SUPABASE_ANON_KEY);
        httpClient.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
        httpClient.addHeader("Content-Type", "application/json");
        httpClient.addHeader("Prefer", "return=minimal");

        int httpCode = httpClient.POST(jsonString);
        unsigned long elapsed = millis() - t0;

        if (httpCode >= 200 && httpCode < 300) {
            httpClient.getString(); // drain response
            Serial.printf("[DoorGuard] >>> Ultra-Fast Mumbai Direct Sync in %lums (HTTP %d) <<<\n", elapsed, httpCode);
            return true;
        } else {
            Serial.printf("[DoorGuard] Direct Supabase Sync HTTP %d (%s) in %lums. Using Render fallback...\n",
                          httpCode, httpClient.errorToString(httpCode).c_str(), elapsed);
            httpClient.end();
        }
    }
    #endif

    // 2. Fallback to Render Cloud Backend
    int httpCode = executePost("/api/events", doc);
    unsigned long elapsed = millis() - t0;

    if (httpCode >= 200 && httpCode < 300) {
        Serial.printf("[DoorGuard] >>> Fallback Event Synced in %lums (HTTP %d) <<<\n", elapsed, httpCode);
        return true;
    } else {
        Serial.printf("[DoorGuard] Event Failed in %lums (HTTP %d)\n", elapsed, httpCode);
        return false;
    }
}

void sendHeartbeat() {
    JsonDocument doc;
    doc["device_id"] = deviceId;
    doc["state"] = doorStateToString(currentDoorState);
    doc["rssi"] = WiFi.RSSI();
    doc["ip_address"] = WiFi.localIP().toString();

    unsigned long t0 = millis();
    int httpCode = executePost("/api/heartbeat", doc);
    unsigned long elapsed = millis() - t0;

    if (httpCode >= 200 && httpCode < 300) {
        Serial.printf("[DoorGuard] Heartbeat OK (%d) in %lums | State: %s | RSSI: %d dBm | Pin: %d\n",
                      httpCode, elapsed, doorStateToString(currentDoorState), WiFi.RSSI(), digitalRead(REED_SWITCH_PIN));
    } else {
        Serial.printf("[DoorGuard] Heartbeat Failed (%d) in %lums | Pin: %d\n", httpCode, elapsed, digitalRead(REED_SWITCH_PIN));
    }
}

// =====================================================================
// Web Portal (Fallback AP Mode)
// =====================================================================

void handleRoot() {
    String options = "";
    int n = WiFi.scanNetworks();
    for (int i = 0; i < n; ++i) {
        String ssid = WiFi.SSID(i);
        int rssi = WiFi.RSSI(i);
        options += "<option value='" + ssid + "'>" + ssid + " (" + String(rssi) + " dBm)</option>";
    }

    int rawPin = digitalRead(REED_SWITCH_PIN);
    DoorState st = readSensorState();

    String html = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DoorGuard Setup</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #090d16; color: #f1f5f9; padding: 20px; margin: 0; }
        .card { max-width: 420px; margin: 20px auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        h1 { font-size: 20px; margin-top: 0; color: #10b981; display: flex; align-items: center; gap: 8px; }
        label { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #94a3b8; display: block; margin-top: 14px; margin-bottom: 6px; }
        input, select { width: 100%; box-sizing: border-box; padding: 12px; border-radius: 8px; border: 1px solid #334155; background: #0b1120; color: #f8fafc; font-size: 14px; }
        input:focus, select:focus { outline: none; border-color: #10b981; }
        button { width: 100%; padding: 14px; border-radius: 8px; border: none; background: #10b981; color: white; font-size: 15px; font-weight: bold; cursor: pointer; margin-top: 22px; transition: background 0.2s; }
        button:hover { background: #059669; }
        .status-box { background: #0b1120; border: 1px solid #1e293b; border-radius: 8px; padding: 12px; margin-top: 16px; font-size: 13px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; }
        .open { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid #f59e0b; }
        .closed { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #10b981; }
    </style>
</head>
<body>
    <div class="card">
        <h1>DoorGuard Setup</h1>
        <p style="font-size: 13px; color: #94a3b8; margin: 0 0 16px 0;">Configure your Wi-Fi network and backend server.</p>
        
        <div class="status-box">
            <strong>Reed Switch Sensor (GPIO 4):</strong><br>
            Current State: <span class="badge )rawliteral" + String(st == STATE_OPEN ? "open'>OPEN" : "closed'>CLOSED") + R"rawliteral(</span> (Raw Pin: )rawliteral" + String(rawPin) + R"rawliteral()
        </div>

        <form action="/save" method="POST">
            <label>Select Wi-Fi Network</label>
            <select name="ssid" required>
                )rawliteral" + options + R"rawliteral(
            </select>
            
            <label>Or Enter SSID Manually</label>
            <input type="text" name="custom_ssid" placeholder="Network SSID if hidden">

            <label>Wi-Fi Password</label>
            <input type="password" name="password" placeholder="Wi-Fi Password">

            <label>Backend URL (Computer LAN IP)</label>
            <input type="text" name="backend_url" value=")rawliteral" + backendUrl + R"rawliteral(" required>

            <label>Device ID</label>
            <input type="text" name="device_id" value=")rawliteral" + deviceId + R"rawliteral(" required>

            <button type="submit">Save & Connect</button>
        </form>
    </div>
</body>
</html>
)rawliteral";
    server.send(200, "text/html", html);
}

void handleSave() {
    String chosenSsid = server.arg("custom_ssid");
    if (chosenSsid.length() == 0) {
        chosenSsid = server.arg("ssid");
    }
    String chosenPass = server.arg("password");
    String chosenUrl = server.arg("backend_url");
    String chosenDev = server.arg("device_id");

    preferences.begin("doorguard", false);
    preferences.putString("ssid", chosenSsid);
    preferences.putString("pass", chosenPass);
    preferences.putString("url", chosenUrl);
    preferences.putString("dev", chosenDev);
    preferences.end();

    String successHtml = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Saved</title>
    <style>
        body { font-family: sans-serif; background: #090d16; color: #f1f5f9; text-align: center; padding: 40px; }
        .card { max-width: 360px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 24px; }
        h2 { color: #10b981; }
    </style>
</head>
<body>
    <div class="card">
        <h2>Settings Saved!</h2>
        <p>The ESP32 is rebooting and connecting to your Wi-Fi network...</p>
        <p style="color: #94a3b8; font-size: 13px;">You can now close this page and open your DoorGuard dashboard.</p>
    </div>
</body>
</html>
)rawliteral";
    server.send(200, "text/html", successHtml);
    delay(1500);
    ESP.restart();
}

void startApMode() {
    isApMode = true;
    Serial.println("\n-----------------------------------------------------");
    Serial.println("[AP Mode] Could not connect to any known Wi-Fi.");
    Serial.println("[AP Mode] Starting Setup Access Point: DoorGuard-Setup");
    Serial.println("-----------------------------------------------------");

    WiFi.disconnect();
    WiFi.mode(WIFI_AP_STA);
    WiFi.softAP("DoorGuard-Setup", "doorguard123");

    IPAddress apIP = WiFi.softAPIP();
    Serial.print("[AP Mode] Web Portal URL: http://");
    Serial.println(apIP);
    Serial.println("[AP Mode] Connect your phone/laptop to 'DoorGuard-Setup'");
    Serial.println("[AP Mode] (Password: doorguard123) and visit http://192.168.4.1");
    Serial.println("-----------------------------------------------------\n");

    server.on("/", handleRoot);
    server.on("/save", HTTP_POST, handleSave);
    server.begin();
    apStartTime = millis();
}

// =====================================================================
// Setup & Loop
// =====================================================================

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n==========================================");
    Serial.println("  DoorGuard ESP32 Smart Door Monitor");
    Serial.println("  MCA IoT Project Multi-WiFi Firmware v2.0");
    Serial.println("==========================================");

    // Initialize Reed Switch pin
    pinMode(REED_SWITCH_PIN, INPUT_PULLUP);
    Serial.printf("[Hardware] Configured Reed Switch on GPIO %d (INPUT_PULLUP)\n", REED_SWITCH_PIN);

    #ifdef STATUS_LED_PIN
    pinMode(STATUS_LED_PIN, OUTPUT);
    digitalWrite(STATUS_LED_PIN, LOW);
    Serial.printf("[Hardware] Configured Onboard Status LED on GPIO %d\n", STATUS_LED_PIN);
    #endif

    // Sample initial sensor reading
    int initialReading = digitalRead(REED_SWITCH_PIN);
    lastRawPinReading = initialReading;
    currentDoorState = readSensorState();

    Serial.printf("[Hardware] Initial State: %s (Raw Pin: %d)\n",
                  doorStateToString(currentDoorState), initialReading);

    // Save and enforce target credentials in NVS preferences
    preferences.begin("doorguard", false);
    wifiSsid = WIFI_SSID;
    wifiPassword = WIFI_PASSWORD;
    backendUrl = BACKEND_BASE_URL;
    deviceId = DEVICE_ID;
    preferences.putString("ssid", wifiSsid);
    preferences.putString("pass", wifiPassword);
    preferences.putString("url", backendUrl);
    preferences.putString("dev", deviceId);
    preferences.end();

    // Reset Wi-Fi stack & configure Station mode
    WiFi.disconnect(true);
    delay(200);
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.setSleep(false);

    // Register all known networks from config.h into WiFiMulti
    for (size_t i = 0; i < NUM_KNOWN_NETWORKS; i++) {
        wifiMulti.addAP(KNOWN_NETWORKS[i].ssid, KNOWN_NETWORKS[i].password);
        Serial.printf("[Multi-WiFi] Registered: %s\n", KNOWN_NETWORKS[i].ssid);
    }

    // Direct Fast Connection to primary SSID
    Serial.printf("\n[WiFi] Connecting directly to '%s'...\n", WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 7000) {
        delay(300);
        Serial.print(".");
        #ifdef STATUS_LED_PIN
        digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN));
        #endif
    }
    Serial.println();

    // Fallback if direct primary connection did not succeed
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[WiFi Scan] Scanning for nearby 2.4 GHz networks...");
        int n = WiFi.scanNetworks();
        Serial.printf("[WiFi Scan] Discovered %d networks:\n", n);
        for (int i = 0; i < n; ++i) {
            String foundSsid = WiFi.SSID(i);
            int rssi = WiFi.RSSI(i);
            int ch = WiFi.channel(i);
            Serial.printf("  [%d] SSID: '%s' | RSSI: %d dBm | Ch: %d\n", i + 1, foundSsid.c_str(), rssi, ch);
        }

        int matchedIndex = -1;
        for (size_t k = 0; k < NUM_KNOWN_NETWORKS; k++) {
            for (int i = 0; i < n; i++) {
                if (WiFi.SSID(i).equals(KNOWN_NETWORKS[k].ssid)) {
                    matchedIndex = k;
                    break;
                }
            }
            if (matchedIndex >= 0) break;
        }

        if (matchedIndex >= 0) {
            Serial.printf("\n[WiFi] Target known network found: '%s'! Connecting directly...\n", KNOWN_NETWORKS[matchedIndex].ssid);
            WiFi.begin(KNOWN_NETWORKS[matchedIndex].ssid, KNOWN_NETWORKS[matchedIndex].password);
            unsigned long startScanConn = millis();
            while (WiFi.status() != WL_CONNECTED && millis() - startScanConn < 8000) {
                delay(400);
                Serial.print(".");
                #ifdef STATUS_LED_PIN
                digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN));
                #endif
            }
            Serial.println();
        }

        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("[Multi-WiFi] Attempting WiFiMulti scan...");
            unsigned long startAttempt = millis();
            while (wifiMulti.run() != WL_CONNECTED && millis() - startAttempt < 6000) {
                delay(500);
                Serial.print(".");
            }
            Serial.println();
        }
    }

    if (WiFi.status() == WL_CONNECTED) {
        updateNetworkSettings();
    } else {
        Serial.println("\n[Multi-WiFi] Target network 'moto g96 5G_5200' not detected on 2.4 GHz.");
        Serial.println(">> PLEASE NOTE: Ensure your Phone Hotspot AP Band is set to 2.4 GHz (or 'Extend Compatibility' is turned ON in settings) <<");
        Serial.println("[Multi-WiFi] Starting background auto-discovery mode...");
        startApMode();
    }

    // Initialize timers & force initial sync to server as soon as connected
    lastSyncedDoorState = STATE_UNKNOWN;
    lastDebounceTime = millis();
    lastStateChangeTime = millis();
}

void loop() {
    unsigned long currentMillis = millis();

    // If in setup AP mode, serve HTTP web portal requests & background scan for hotspot
    if (isApMode) {
        #ifdef STATUS_LED_PIN
        updateStatusLed();
        #endif
        server.handleClient();
        if (currentMillis - lastWifiCheckTime >= 8000) {
            lastWifiCheckTime = currentMillis;
            int n = WiFi.scanNetworks(false, true);
            for (int i = 0; i < n; i++) {
                String s = WiFi.SSID(i);
                for (size_t k = 0; k < NUM_KNOWN_NETWORKS; k++) {
                    if (s.equals(KNOWN_NETWORKS[k].ssid)) {
                        Serial.printf("\n[Auto-Connect] Hotspot '%s' detected! Connecting now...\n", KNOWN_NETWORKS[k].ssid);
                        server.stop();
                        WiFi.softAPdisconnect(true);
                        isApMode = false;
                        WiFi.mode(WIFI_STA);
                        WiFi.begin(KNOWN_NETWORKS[k].ssid, KNOWN_NETWORKS[k].password);
                        delay(2000);
                        return;
                    }
                }
            }
        }
        return;
    }

    // -------------------------------------------------------------
    // 1. Physical Sensor Evaluation (Never Blocked by Network State!)
    // -------------------------------------------------------------
    int rawReading = digitalRead(REED_SWITCH_PIN);
    DoorState candidateState = readSensorState();

    if (rawReading != lastRawPinReading) {
        lastDebounceTime = currentMillis;
        lastRawPinReading = rawReading;
    }

    // Debounce filter:
    // Closing (magnet attached): 25ms immediate confirmation
    // Opening (magnet separated): 40ms steady confirmation
    // Reopening within post-close settle: 150ms anti-rebound latch filter
    unsigned long requiredDebounceMs = DEBOUNCE_DELAY_MS;
    if (candidateState == STATE_CLOSED) {
        requiredDebounceMs = 25; // Instant 25ms closing confirmation
    } else if (currentDoorState == STATE_CLOSED && (currentMillis - lastCloseEventTime < POST_CLOSE_SETTLE_MS)) {
        requiredDebounceMs = 150; // Anti-rebound latch filter
    }

    if ((currentMillis - lastDebounceTime) >= requiredDebounceMs) {
        if (candidateState != currentDoorState) {
            // Confirm with 3 quick micro-samples
            bool allMatch = true;
            for (int s = 0; s < 3; s++) {
                delayMicroseconds(500);
                if (readSensorState() != candidateState) {
                    allMatch = false;
                    break;
                }
            }

            if (allMatch) {
                currentDoorState = candidateState;
                lastStateChangeTime = currentMillis;
                if (currentDoorState == STATE_CLOSED) {
                    lastCloseEventTime = currentMillis;
                }

                Serial.println();
                Serial.printf(">>> PHYSICAL SENSOR STATE CHANGED: %s (Raw Pin: %d) <<<\n",
                              doorStateToString(currentDoorState), rawReading);
            }
        }
    }

    // -------------------------------------------------------------
    // 2. Wi-Fi Management & Telemetry Dispatch
    // -------------------------------------------------------------
    if (WiFi.status() != WL_CONNECTED) {
        lastConnectedSsid = "";
        if (currentMillis - lastWifiCheckTime >= WIFI_RETRY_INTERVAL_MS) {
            lastWifiCheckTime = currentMillis;
            Serial.println("[Multi-WiFi] Re-scanning for known networks...");
            if (wifiMulti.run() == WL_CONNECTED) {
                updateNetworkSettings();
                Serial.println("[Multi-WiFi] Reconnected successfully!");
            }
        }
    } else {
        // Detect if network connected or SSID changed
        String curSsid = WiFi.SSID();
        if (curSsid.length() > 0 && curSsid != lastConnectedSsid) {
            lastConnectedSsid = curSsid;
            updateNetworkSettings();
        }

        // Sync state if current physical state differs from what was last synced with the server
        if (currentDoorState != lastSyncedDoorState) {
            DoorState stateToDispatch = currentDoorState;
            if (sendDoorEvent(stateToDispatch)) {
                lastSyncedDoorState = stateToDispatch;
                lastHeartbeatTime = millis();
                if (stateToDispatch == STATE_CLOSED) {
                    lastCloseEventTime = millis();
                }
            } else {
                delay(100); // Back off slightly on failure before next loop retry
            }

            // Resynchronize debounce timer and pin reading after network I/O
            lastRawPinReading = digitalRead(REED_SWITCH_PIN);
            lastDebounceTime = millis();
        }

        // Send Heartbeat every ~15s when state is idle (keeps device online on dashboard)
        if (currentDoorState == lastSyncedDoorState &&
            (currentMillis - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS)) {
            lastHeartbeatTime = currentMillis;
            sendHeartbeat();
            lastRawPinReading = digitalRead(REED_SWITCH_PIN);
            lastDebounceTime = millis();
        }
    }

    #ifdef STATUS_LED_PIN
    updateStatusLed();
    #endif

    delay(10);
}
