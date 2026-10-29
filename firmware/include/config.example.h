#pragma once

// =====================================================================
// DoorGuard ESP32 Firmware Configuration Template
// Copy this file to "config.h" and insert your real network credentials.
// NOTE: "config.h" is gitignored and will NOT be included in git or ZIP.
// =====================================================================

// 1. Wi-Fi Settings
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// 2. DoorGuard Flask Backend URL
// IMPORTANT: Do NOT use "localhost" or "127.0.0.1".
// Use your computer's local network LAN IP address (e.g., http://192.168.1.8:5000).
#define BACKEND_BASE_URL "http://192.168.1.8:5000"

// 3. Device Identification
#define DEVICE_ID "esp32_main_gate"
#define DEVICE_NAME "Main Gate"

// 4. Hardware Pin Mapping
// Reed Switch Wire 1 -> GPIO 4
// Reed Switch Wire 2 -> GND
#define REED_SWITCH_PIN 4

// 5. Sensor Logic Configuration
// Default with INPUT_PULLUP:
// - Magnet present (Door CLOSED) -> Reed switch closed -> Pin pulled to GND (LOW)
// - Magnet absent (Door OPEN)    -> Reed switch open   -> Pin pulled HIGH
// Set to true if LOW = CLOSED, HIGH = OPEN.
#define REED_SWITCH_ACTIVE_LOW true

// 6. Timing and Intervals (milliseconds)
#define DEBOUNCE_DELAY_MS 50
#define HEARTBEAT_INTERVAL_MS 10000
#define WIFI_RETRY_INTERVAL_MS 5000
#define HTTP_TIMEOUT_MS 4000

