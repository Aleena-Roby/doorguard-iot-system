#pragma once
#include <Arduino.h>

// =====================================================================
// DoorGuard ESP32 Configuration Template (config.example.h)
// =====================================================================

struct KnownNetwork {
    const char* ssid;
    const char* password;
    const char* backendUrl;
};

static const KnownNetwork KNOWN_NETWORKS[] = {
    { "Your_WiFi_SSID", "Your_WiFi_Password", "https://doorguard-backend.onrender.com" },
};

static const size_t NUM_KNOWN_NETWORKS = sizeof(KNOWN_NETWORKS) / sizeof(KNOWN_NETWORKS[0]);

// Live Cloud Backend (or local http://<YOUR_IP>:5000)
#define DEFAULT_BACKEND_URL "https://doorguard-backend.onrender.com"

#define DEVICE_ID "esp32_main_gate"
#define DEVICE_NAME "Main Gate"

#define REED_SWITCH_PIN 4
#define REED_SWITCH_ACTIVE_LOW true
#define STATUS_LED_PIN 2

#define DEBOUNCE_DELAY_MS 50
#define HEARTBEAT_INTERVAL_MS 10000
#define WIFI_RETRY_INTERVAL_MS 5000
#define HTTP_TIMEOUT_MS 6000

#define WIFI_SSID "Your_WiFi_SSID"
#define WIFI_PASSWORD "Your_WiFi_Password"
#define BACKEND_BASE_URL "https://doorguard-backend.onrender.com"
