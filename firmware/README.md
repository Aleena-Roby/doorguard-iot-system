# DoorGuard ESP32 Firmware Guide

This directory contains the production C++ firmware for the **DoorGuard Smart Door Monitoring System**, built using the Espressif Arduino framework on **PlatformIO** in Visual Studio Code.

---

## 1. Hardware Overview & Wiring

| Component | ESP32 Pin | Function | Notes |
| :--- | :--- | :--- | :--- |
| **Magnetic Reed Switch Wire 1** | **GPIO 4** (D4 / IO4) | Door Sensor Input | Configured with internal `INPUT_PULLUP` |
| **Magnetic Reed Switch Wire 2** | **GND** | Ground Reference | Non-polarized; either wire can connect to GND |
| **Micro-USB / Type-C Cable** | USB Port | Flashing & Serial Monitor | Connect to your computer's USB port |

### Electrical Operation:
* **Door Closed:** The magnet aligns with the reed switch, closing the physical reed contacts. GPIO 4 is pulled directly to GND (`LOW`).
* **Door Open:** The magnet moves away as the door swings open, breaking the contact. The internal pull-up resistor holds GPIO 4 at 3.3V (`HIGH`).
* **Debouncing:** Firmware implements non-blocking software debouncing (50 ms) to suppress contact bounce and false triggers.

> [!CAUTION]
> Never connect 5V to ESP32 GPIO pins! The ESP32 is a 3.3V logic microcontroller. GPIO 4 uses the internal 3.3V pull-up resistor.

---

## 2. Configuration (`config.h`)

1. Copy the example configuration template:
   ```bash
   cp include/config.example.h include/config.h
   ```
2. Open `include/config.h` in your editor and configure your local Wi-Fi credentials and LAN IP address:
   ```cpp
   #define WIFI_SSID "Your_WiFi_Name"
   #define WIFI_PASSWORD "Your_WiFi_Password"
   
   // IMPORTANT: Use your computer's LAN IP address, NOT localhost!
   // Example: http://192.168.1.8:5000
   #define BACKEND_BASE_URL "http://192.168.1.8:5000"
   
   #define DEVICE_ID "esp32_door_sensor_01"
   #define REED_SWITCH_PIN 4
   #define REED_SWITCH_ACTIVE_LOW true
   ```
> [!NOTE]
> `include/config.h` is excluded in `.gitignore` to protect your network passwords from being committed or distributed in handoff ZIPs.

---

## 3. PlatformIO Commands (CLI)

Using PlatformIO Core:

### 1. Build Firmware:
```bash
pio run
```

### 2. Upload / Flash Firmware:
```bash
pio run --target upload
```
*To specify a specific serial port (e.g., COM10):*
```bash
pio run --target upload --upload-port COM10
```

### 3. Open Serial Monitor (115200 Baud):
```bash
pio device monitor -b 115200
```

### 4. Clean and Rebuild:
```bash
pio run --target clean
pio run
```

---

## 4. Visual Studio Code GUI Instructions

1. Install the **PlatformIO IDE** extension from the VS Code Extensions Marketplace (`Ctrl+Shift+X` -> search `PlatformIO IDE`).
2. Open the `firmware/` folder in VS Code.
3. In the PlatformIO toolbar at the bottom of VS Code:
   * Click **✓ (PlatformIO: Build)** to compile.
   * Click **→ (PlatformIO: Upload)** to flash firmware to the ESP32.
   * Click **🔌 (PlatformIO: Serial Monitor)** to observe real-time diagnostics.

---

## 5. Troubleshooting & Driver Installation

1. **Serial Port Not Detected:**
   * ESP32 boards commonly use the **Silicon Labs CP210x** or **WCH CH340** USB-to-UART bridge.
   * Download the official CP210x VCP driver: [Silicon Labs Drivers](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers)
   * Verify connected ports with `pio device list` or PowerShell `[System.IO.Ports.SerialPort]::GetPortNames()`.
2. **ESP32 Upload Stalls on "Connecting........_____.....":**
   * Some ESP32 development boards require pressing and holding the physical **BOOT** (or **IO0**) button when `Connecting...` appears in the terminal until the flashing percentage begins.
3. **Cannot Reach Flask Backend:**
   * Ensure both the ESP32 and your computer are on the **same Wi-Fi network**.
   * Verify that your computer's firewall allows incoming connections on TCP port 5000.

