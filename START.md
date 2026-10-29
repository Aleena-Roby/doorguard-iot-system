# 🚀 Quick Start Guide — DoorGuard IoT System

Follow these instructions to start the entire DoorGuard stack with a single command.

---

## ⚡ 1. One-Command Startup

### In **Command Prompt (CMD)**:

```cmd
cd /d C:\project\IOT && start.bat
```

*(Or simply double-click **`start.bat`** or **`start_all.bat`** in File Explorer)*

---

### In **PowerShell**:

```powershell
Set-Location C:\project\IOT; .\start.bat
```

*(Or `Set-Location C:\project\IOT; .\start_all.ps1`)*

---

## 🛑 2. Stop All Services

When you are done testing, run:

```cmd
cd /d C:\project\IOT && stop_all.bat
```

*(Or double-click **`stop_all.bat`**)*

---

## 🔍 What Happens Automatically

When you run `start.bat`:

1. **PostgreSQL 16** starts in Docker (`localhost:5432`) with persistent data volume.
2. **Flask REST API** starts on `0.0.0.0:5000` (LAN reachable for your ESP32).
3. **React + Vite Dashboard** starts on `localhost:5173`.
4. **Browser Opens Automatically** at `http://localhost:5173`.
5. **Audible Alert Siren** is active via the browser Web Audio API synthesizer.

---

## 🌐 Service URLs

* **Dashboard:** [http://localhost:5173](http://localhost:5173)
* **Backend API Health:** [http://localhost:5000/api/health](http://localhost:5000/api/health)
* **Live Status:** [http://localhost:5000/api/status](http://localhost:5000/api/status)
* **Registered Devices:** [http://localhost:5000/api/devices](http://localhost:5000/api/devices)

---

## 🧪 Testing Your Sensor & Siren

1. Open **[http://localhost:5173](http://localhost:5173)** in your browser.
2. Ensure the top-right button says **`[🔊 Sound Alarm ON]`** (click once to unlock browser audio if needed).
3. **Open the Gate:** Separate the magnet from the reed switch on ESP32 GPIO 4.
   - Dashboard status switches to **`OPEN` / `UNLATCHED`**.
   - Continuous timer starts incrementing.
   - When open time passes the threshold (default: 10s), the **pulsing two-tone warning siren** (880 Hz $\rightarrow$ 660 Hz) begins beeping every 1.4 seconds.
4. **Close the Gate:** Bring the magnet back against the switch.
   - Dashboard switches to **`CLOSED` / `PROTECTED`**.
   - The warning siren immediately silences.
   - The completed opening duration is saved to PostgreSQL and appears in the **Live Activity Feed**.
