#include <Arduino.h>
#include <WiFi.h>
#include <WiFiMulti.h>
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

Preferences preferences;
WebServer server(80);
WiFiMulti wifiMulti;

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
DoorState lastDebouncedState = STATE_UNKNOWN;
int lastRawPinReading = -1;
unsigned long lastDebounceTime = 0;

unsigned long lastHeartbeatTime = 0;
unsigned long lastWifiCheckTime = 0;
unsigned long sequenceNumber = 0;

bool initialEventSent = false;
bool pendingStateChange = false;

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

    // 1. If Door/Gate is OPEN: Rapid Emergency Strobe Alert (every 80 ms)
    if (currentDoorState == STATE_OPEN) {
        if (currentMillis - lastLedToggleTime >= 80) {
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
// HTTP Client Methods
// =====================================================================

bool sendDoorEvent(DoorState state) {
    if (WiFi.status() != WL_CONNECTED || isApMode) {
        return false;
    }

    sequenceNumber++;

    HTTPClient http;
    String url = backendUrl + "/api/events";
    Serial.printf("[DoorGuard] Sending Event to %s ...\n", url.c_str());
    http.begin(url);
    http.setTimeout(HTTP_TIMEOUT_MS);
    http.addHeader("Content-Type", "application/json");

    JsonDocument doc;
    doc["device_id"] = deviceId;
    doc["state"] = doorStateToString(state);
    doc["source"] = "ESP32";
    doc["sequence_number"] = sequenceNumber;

    String jsonString;
    serializeJson(doc, jsonString);

    Serial.println();
    Serial.print("[DoorGuard] Event -> ");
    Serial.println(jsonString);

    int httpCode = http.POST(jsonString);

    if (httpCode > 0) {
        Serial.printf("[DoorGuard] HTTP Response: %d\n", httpCode);
        http.end();
        return (httpCode >= 200 && httpCode < 300);
    } else {
        Serial.printf("[DoorGuard] HTTP Error: %s\n", http.errorToString(httpCode).c_str());
        http.end();
        return false;
    }
}

void sendHeartbeat() {
    if (WiFi.status() != WL_CONNECTED || isApMode) {
        return;
    }

    HTTPClient http;
    String url = backendUrl + "/api/heartbeat";
    Serial.printf("[DoorGuard] Sending Heartbeat to %s ...\n", url.c_str());
    http.begin(url);
    http.setTimeout(HTTP_TIMEOUT_MS);
    http.addHeader("Content-Type", "application/json");

    JsonDocument doc;
    doc["device_id"] = deviceId;
    doc["state"] = doorStateToString(currentDoorState);
    doc["rssi"] = WiFi.RSSI();
    doc["ip_address"] = WiFi.localIP().toString();

    String jsonString;
    serializeJson(doc, jsonString);

    int httpCode = http.POST(jsonString);
    if (httpCode > 0) {
        Serial.printf("[DoorGuard] Heartbeat OK (%d) | State: %s | RSSI: %d dBm\n",
                      httpCode, doorStateToString(currentDoorState), WiFi.RSSI());
    } else {
        Serial.printf("[DoorGuard] Heartbeat Failed: %s\n", http.errorToString(httpCode).c_str());
    }
    http.end();
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
    lastDebouncedState = readSensorState();
    currentDoorState = lastDebouncedState;

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

    // Active scan to discover visible networks
    Serial.println("\n[WiFi Scan] Scanning for nearby 2.4 GHz networks...");
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
        unsigned long start = millis();
        while (WiFi.status() != WL_CONNECTED && millis() - start < 12000) {
            delay(500);
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
        while (wifiMulti.run() != WL_CONNECTED && millis() - startAttempt < 8000) {
            delay(800);
            Serial.print(".");
        }
        Serial.println();
    }

    if (WiFi.status() == WL_CONNECTED) {
        updateNetworkSettings();
    } else {
        Serial.println("\n[Multi-WiFi] Target network 'moto g96 5G_5200' not detected on 2.4 GHz.");
        Serial.println(">> PLEASE NOTE: Ensure your Phone Hotspot AP Band is set to 2.4 GHz (or 'Extend Compatibility' is turned ON in settings) <<");
        Serial.println("[Multi-WiFi] Starting background auto-discovery mode...");
        startApMode();
    }

    // Queue initial physical state for immediate dispatch once connected
    pendingStateChange = true;
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
    // 1. Debounce Sensor Reading (Non-blocking, Always Active)
    // -------------------------------------------------------------
    int rawReading = digitalRead(REED_SWITCH_PIN);

    if (rawReading != lastRawPinReading) {
        lastDebounceTime = currentMillis;
        lastRawPinReading = rawReading;
    }

    if ((currentMillis - lastDebounceTime) > DEBOUNCE_DELAY_MS) {
        DoorState sampledState = readSensorState();

        if (sampledState != currentDoorState) {
            currentDoorState = sampledState;
            pendingStateChange = true;

            Serial.println();
            Serial.printf(">>> PHYSICAL SENSOR STATE CHANGED: %s (Raw Pin: %d) <<<\n",
                          doorStateToString(currentDoorState), rawReading);
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
        // Dispatch Door Events
        if (pendingStateChange) {
            if (sendDoorEvent(currentDoorState)) {
                pendingStateChange = false;
                initialEventSent = true;
                lastHeartbeatTime = currentMillis;
            }
        }

        // Send Heartbeat every ~10 seconds
        if (currentMillis - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS) {
            lastHeartbeatTime = currentMillis;
            sendHeartbeat();
        }
    }

    #ifdef STATUS_LED_PIN
    updateStatusLed();
    #endif

    delay(10);
}
