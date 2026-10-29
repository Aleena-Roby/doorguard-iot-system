# DoorGuard Hardware Setup & ESP32 Wiring Guide

This guide details the physical assembly, electrical pin connections, sensor testing, and microcontroller flashing for the **DoorGuard Smart Door Monitoring System**.

---

## 1. Hardware Bill of Materials (BOM)

| Item | Quantity | Specifications |
| :--- | :--- | :--- |
| **ESP32 Development Board** | 1 | NodeMCU ESP32 / ESP32-WROOM-32 / 30-pin or 38-pin DevKit |
| **Magnetic Reed Switch Sensor** | 1 | 2-wire surface mount or recessed magnetic reed switch (normally open) |
| **Matching Actuator Magnet** | 1 | Included with reed switch set |
| **Jumper Wires** | 2 | Female-to-Male or Female-to-Female jumper wires |
| **Micro-USB / Type-C Data Cable** | 1 | Must support **data transfer** (not a charge-only cable) |
| **Development Host Computer** | 1 | Windows, macOS, or Linux running local Flask backend and PostgreSQL |

---

## 2. Pin Mapping & Wiring Diagram

The magnetic reed switch connects directly between ESP32 **GPIO 4** and **GND**. No external pull-up resistor or breadboard is required because the firmware activates the ESP32's internal pull-up resistor (`INPUT_PULLUP`).

```
+------------------------------------------+
|            ESP32 Development Board       |
|                                          |
|  [GPIO 4] -------------------+           |
|                              |           |
|  [GND]    ---------+         |           |
|                    |         |           |
+--------------------|---------|-----------+
                     |         |
                     |         |
             +-------v---------v-------+
             |   Magnetic Reed Switch  |
             |   (Two-wire sensor)     |
             +-------------------------+
                         |
                 [ 5mm - 15mm gap ]
                         |
             +-------------------------+
             |     Actuator Magnet     |
             |   (Mounted on door)     |
             +-------------------------+
```

### Wiring Table:
| Reed Switch Lead | ESP32 Pin Header | Pin Type | Notes |
| :--- | :--- | :--- | :--- |
| **Wire 1** | **GPIO 4 / IO4 / D4** | Digital Input | Configured in firmware with `INPUT_PULLUP` |
| **Wire 2** | **GND** | Ground | Any available GND pin on the ESP32 |

> [!IMPORTANT]
> The reed switch is a passive mechanical contact and is **not polarized**. It does not matter which wire goes to GPIO 4 and which goes to GND.
>
> **Safety Warning:** Disconnect the USB cable from your computer before attaching or modifying jumper wires. Never connect 5V (VIN/VBUS) directly to any ESP32 GPIO pin.

---

## 3. Physical Mounting & Magnet Alignment

1. **Sensor Placement:**
   * Mount the wired reed switch block to the **stationary door frame**.
   * Mount the magnet block to the **moving door leaf**.
2. **Alignment & Gap Distance:**
   * When the door is fully shut, ensure the magnet and switch are aligned and no more than **10 mm (0.4 inches)** apart.
   * When the door swings open, the distance increases beyond 20 mm, releasing the reed switch contacts.

---

## 4. Electrical Sensor Logic & Debounce

The firmware initializes the sensor in `setup()`:
```cpp
pinMode(REED_SWITCH_PIN, INPUT_PULLUP);
```

* **Door Closed (Magnet Near):** The magnetic field draws the internal ferromagnetic reeds together, completing the circuit to GND. GPIO 4 reads **`LOW` (0V)**.
* **Door Open (Magnet Away):** The reeds spring apart, breaking the circuit. The internal pull-up resistor pulls GPIO 4 to **`HIGH` (3.3V)**.
* **Contact Debouncing:** Mechanical reed switches vibrate or bounce microscopically when closing. The firmware implements a 50 ms non-blocking software debounce filter so that a single door movement generates exactly one clean event.

---

## 5. Wi-Fi & LAN IP Configuration

The ESP32 communicates with your computer over your local Wi-Fi router.

> [!WARNING]
> **Do not use `localhost` or `127.0.0.1` in the firmware!**
> `localhost` refers to the ESP32 itself. You must use your host computer's local network LAN IP address (e.g., `http://192.168.1.8:5000`).

### Finding Your Computer's LAN IP:
* **Windows:** Open PowerShell and run:
  ```powershell
  Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -like "*Wi-Fi*" }
  ```
  *(Look for the address starting with `192.168.x.x` or `10.x.x.x`)*
* **macOS / Linux:**
  ```bash
  ipconfig getifaddr en0   # macOS
  hostname -I              # Linux
  ```

### Router Network Rules:
* Both your computer and the ESP32 must be connected to the **same 2.4 GHz Wi-Fi SSID** (ESP32 does not support 5 GHz Wi-Fi).
* Disable **Client Isolation / AP Isolation** in your Wi-Fi router settings if enabled, as isolation blocks devices on the same Wi-Fi from talking to each other.
* Ensure Windows Defender Firewall allows incoming TCP connections on port 5000:
  ```powershell
  New-NetFirewallRule -DisplayName "DoorGuard Flask 5000" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
  ```

---

## 6. Flashing the ESP32 via PlatformIO

### Step 1: Create your local `config.h`
```bash
cd firmware
cp include/config.example.h include/config.h
```
Edit `include/config.h` with your Wi-Fi SSID, password, and computer LAN IP.

### Step 2: Identify Connected Serial Port
In PowerShell:
```powershell
[System.IO.Ports.SerialPort]::GetPortNames()
```
Or with PlatformIO:
```bash
pio device list
```

### Step 3: Compile Firmware
```bash
pio run
```

### Step 4: Flash / Upload Firmware
```bash
pio run --target upload
```
*If multiple ports exist, specify explicitly:*
```bash
pio run --target upload --upload-port COM10
```

> [!TIP]
> If PlatformIO shows `Connecting........_____.....` and times out:
> Press and hold the physical **BOOT** button on the ESP32 development board when the dots appear until upload percentage begins.

### Step 5: Open Serial Monitor
```bash
pio device monitor -b 115200
```
Expected boot output:
```text
==========================================
  DoorGuard ESP32 Smart Door Monitor
  MCA IoT Project Firmware v1.0
==========================================
[Hardware] Configured Reed Switch on GPIO 4 (INPUT_PULLUP)
[Hardware] Initial Door State: CLOSED (Raw Pin: 0)
[WiFi] Connecting to SSID: YourWiFi
......
[WiFi] Connected successfully!
[WiFi] ESP32 IP Address: 192.168.1.145
[DoorGuard] Sending Door Event -> {"device_id":"esp32_door_sensor_01","state":"CLOSED","source":"ESP32","sequence_number":1}
[DoorGuard] HTTP Response Code: 201
```

---

## 7. Physical End-to-End Verification Checklist

1. **Boot Test:** Power the ESP32 via USB and confirm the blue/red power LED is illuminated.
2. **Serial Monitor:** Verify Wi-Fi reports `Connected successfully!` and acquires an IP address.
3. **Initial State:** Confirm the dashboard shows `Device Online` and the door's initial state.
4. **Physical Open Event:** Separate the magnet from the reed switch.
   * Serial Monitor should output: `>>> PHYSICAL SENSOR STATE CHANGED: OPEN <<<`
   * HTTP POST to `/api/events` returns `HTTP Response Code: 201`.
   * Dashboard immediately switches to large red `OPEN` status, and the timer starts ticking.
5. **Alert Trigger Test:** Leave the magnet away for longer than the alert threshold (default: 10s).
   * Confirm the pulsating red security warning banner activates on the dashboard.
6. **Physical Close Event:** Place the magnet back against the reed switch.
   * Serial Monitor outputs: `>>> PHYSICAL SENSOR STATE CHANGED: CLOSED <<<`
   * Dashboard returns to green `SECURE`, timer stops, and alert clears.
   * New row appears in the Event History table with the calculated continuous open duration.

