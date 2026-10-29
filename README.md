# DoorGuard — Smart Door & Gate Monitoring System
### MCA Capstone IoT Project (Phase 1: Local Development & Verification)

---

## ⚡ Quick Start — Run Everything With One Command

Start the PostgreSQL database, Flask backend, React frontend, and open your browser automatically:

### In **Command Prompt (CMD)**:
```cmd
cd /d C:\project\IOT && start.bat
```
*(Or simply double-click **`start.bat`** in File Explorer)*

### In **PowerShell**:
```powershell
Set-Location C:\project\IOT; .\start.bat
```

### 🛑 To Stop All Services:
```cmd
cd /d C:\project\IOT && stop_all.bat
```

---

## 1. Project Overview & MCA Objectives

**DoorGuard** is an end-to-end Internet of Things (IoT) monitoring solution designed to provide real-time status tracking, security alerts, continuous open-duration metrics, audible warning siren beeps, and historical audit logs for gates and entryways.

### Academic & Technical Objectives:
1. **Physical Sensor Integration:** Interface a mechanical magnetic reed switch with an ESP32 microcontroller using internal pull-up logic (`INPUT_PULLUP`) and software debouncing.
2. **Robust Microcontroller Firmware:** Implement clean, non-blocking C++ firmware with Wi-Fi auto-reconnection, monotonic sequence tracking, periodic heartbeats, and HTTP REST telemetry.
3. **Enterprise PostgreSQL Storage:** Guarantee persistent, ACID-compliant storage using PostgreSQL (strictly no SQLite), versioned Alembic migrations, connection pooling, and idempotent event ingestion.
4. **Resilient Flask REST API:** Build a modular Python Flask backend with comprehensive status reporting, active threshold alert computation, CSV export, and separated simulation handling.
5. **Modern Reactive Light-Theme Dashboard:** Deliver an interactive, responsive TypeScript/React dashboard with light theme aesthetics, animated lock/unlock portal graphic, live continuous duration stopwatch, quick alert threshold selector pills, Recharts activity analytics, and live activity feed.
6. **Multi-Door Enterprise Management:** Monitor multiple door locations simultaneously (e.g., Front Door, Back Porch, Garage) with one-click switcher tabs and modal for registering new locations.
7. **Hardware-in-the-Loop Real-Time Integration:** Connect an ESP32 microcontroller with a physical magnetic reed switch over Wi-Fi (`kerala vision`), streaming real-time door events to PostgreSQL.
8. **Cloud-Ready Handoff Architecture:** Design Phase 1 locally so Phase 2 deployment to Render and Supabase can be completed via configuration alone without refactoring code.

---

## 2. End-to-End System Architecture

```text
[ Physical Door ]
       │
[ Magnetic Reed Switch ]
       │ (Two-wire contact)
[ ESP32 GPIO 4 + GND ]
       │ (Wi-Fi 2.4 GHz HTTP POST)
[ Local Wi-Fi Router ]
       │ (LAN: http://192.168.1.8:5000)
[ Python Flask REST API ]
       │ (SQLAlchemy + Psycopg 3)
[ PostgreSQL Database (Docker Port 5432) ]
       │ (HTTP Polling ~1s / JSON)
[ React + Vite + TypeScript Dashboard (Port 5173) ]
```

---

## 3. Technology Stack

* **Frontend:** React 18, Vite 5, TypeScript 5, Tailwind CSS, Lucide React icons, Recharts.
* **Backend:** Python 3.12, Flask 3, SQLAlchemy 2, Alembic / Flask-Migrate, Psycopg 3 (`psycopg[binary]`), Gunicorn, Pytest.
* **Database:** PostgreSQL 16 (Official Docker container with persistent named volume).
* **Firmware:** ESP32 Development Board, PlatformIO Core 6, Espressif Arduino framework, C++, ArduinoJson 7.
* **Infrastructure:** Docker Desktop, Docker Compose, `.env` configuration.

---

## 4. Project Folder Structure

```text
c:\project\IOT\
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── MainStatusCard.tsx
│   │   │   ├── StatsCards.tsx
│   │   │   ├── ActivityChart.tsx
│   │   │   ├── EventHistoryTable.tsx
│   │   │   ├── DeviceStatusCard.tsx
│   │   │   ├── AddDeviceModal.tsx
│   │   │   ├── AlertSettingsCard.tsx
│   │   │   └── SimulationControlsCard.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.css
│   │   └── vite-env.d.ts
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── .env.example
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── extensions.py
│   │   ├── models.py
│   │   ├── routes/
│   │   │   └── api.py
│   │   └── services/
│   │       ├── event_service.py
│   │       ├── stats_service.py
│   │       └── settings_service.py
│   ├── migrations/
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_health.py
│   │   ├── test_events.py
│   │   ├── test_stats.py
│   │   ├── test_simulation.py
│   │   └── test_settings.py
│   ├── requirements.txt
│   ├── pytest.ini
│   ├── Dockerfile
│   ├── run.py
│   └── .env.example
├── firmware/
│   ├── platformio.ini
│   ├── src/
│   │   └── main.cpp
│   ├── include/
│   │   └── config.example.h
│   └── README.md
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── HARDWARE_SETUP.md
├── API_DOCUMENTATION.md
└── DEPLOYMENT_HANDOFF.md
```

---

## 5. Local Setup & Quick Start

### Option A: Automated One-Command Startup (Recommended)
Simply run the startup batch script from CMD or PowerShell:
```cmd
cd /d C:\project\IOT && start.bat
```
*(Or double-click **`start.bat`** in File Explorer. This launches PostgreSQL, Flask backend on port 5000, Vite frontend on port 5173, and opens your browser).*

---

### Option B: Manual Step-by-Step Setup

### Prerequisites
* **Docker Desktop** installed and running.
* **Node.js** (v18+) and npm.
* **Python** (v3.10+) with pip.
* **PlatformIO** (VS Code extension or CLI) for ESP32 firmware development.

---

### Step 1: Start PostgreSQL via Docker Compose
Run the official PostgreSQL container with persistent volume:
```powershell
docker compose up postgres -d
```
Verify the container is healthy:
```powershell
docker compose ps
```

---

### Step 2: Set Up and Run Flask Backend

1. Navigate to the backend directory:
   ```powershell
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
3. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
4. Run Alembic database migrations:
   ```powershell
   flask --app run.py db upgrade
   ```
5. Start the backend development server:
   ```powershell
   python run.py
   ```
   * Backend will be accessible at: `http://localhost:5000`
   * Health endpoint: `http://localhost:5000/api/health`

---

### Step 3: Set Up and Run React Frontend

1. In a new terminal window, navigate to the frontend directory:
   ```powershell
   cd frontend
   ```
2. Install npm packages:
   ```powershell
   npm install
   ```
3. Start the Vite development server:
   ```powershell
   npm run dev
   ```
   * Open your browser at: `http://localhost:5173`

---

## 6. Testing with the Simulation Workflow

You do **not** need a physical ESP32 connected to test the system!
1. Open `http://localhost:5173` in your browser.
2. In the **Hardware Simulation Controls** section:
   * Click **Simulate Door Open**. The dashboard instantly switches to large amber `OPEN`, the live duration timer begins ticking, and a new record is added to PostgreSQL.
   * Wait 10 seconds (default demonstration threshold). The dashboard triggers a pulsating red **SECURITY ALERT** banner.
   * Click **Simulate Door Close**. The alert immediately clears, the status returns to green `CLOSED`, and the continuous duration is saved.
   * In the **Alert Threshold Settings** card, select a different threshold (e.g. `30s` or `60s`). The threshold updates in PostgreSQL without resetting data.
   * Click **Export CSV** in the Event History header to download an audit spreadsheet.
   * Click **Reset Simulation**. Enter confirmation to purge simulated test events while leaving any real ESP32 records intact.

---

## 7. ESP32 Hardware Assembly & Flashing

### Wiring Summary
* **Reed Switch Wire 1** → ESP32 **GPIO 4**
* **Reed Switch Wire 2** → ESP32 **GND**
* *Internal pullup resistor `pinMode(4, INPUT_PULLUP)` is enabled in firmware.*

### Firmware Configuration
1. Open `firmware/include/config.example.h` and copy it to `firmware/include/config.h`:
   ```powershell
   cd firmware
   Copy-Item include\config.example.h include\config.h
   ```
2. Configure your local Wi-Fi SSID, password, and your computer's LAN IP address:
   ```cpp
   #define WIFI_SSID "Your_WiFi_SSID"
   #define WIFI_PASSWORD "Your_WiFi_Password"
   #define BACKEND_BASE_URL "http://192.168.1.8:5000"
   ```
   *(Note: Replace `192.168.1.8` with your actual computer's LAN IP. Never use `localhost` on the ESP32).*

### Flashing with PlatformIO
* **Build Firmware:**
  ```powershell
  pio run
  ```
* **Flash to ESP32:**
  ```powershell
  pio run --target upload --upload-port COM10
  ```
* **View Real-Time Serial Monitor:**
  ```powershell
  pio device monitor -b 115200
  ```

See [HARDWARE_SETUP.md](HARDWARE_SETUP.md) for detailed wiring diagrams, magnet gap guidelines, and port selection.

---

## 8. Automated Testing

Run the full pytest automated test suite against the live PostgreSQL test database:
```powershell
cd backend
.\.venv\Scripts\pytest -v
```
All 13 integration and unit tests execute strictly against PostgreSQL:
- Health and database connectivity
- Valid OPEN and CLOSED state transitions
- Invalid payload rejection (400 Bad Request)
- Idempotency and duplicate event suppression
- Heartbeat telemetry and online/offline status
- Alert threshold triggering and auto-clearing
- Daily statistics and duration calculations
- CSV export generation
- Simulation isolation and reset protection

To verify frontend build integrity:
```powershell
cd frontend
npm run build
```

---

## 9. Creating the Clean Handoff ZIP

To package the project for teammates without including `.env`, `node_modules`, `.venv`, or Git artifacts:
```powershell
Compress-Archive -Path frontend, backend, firmware, docker-compose.yml, .env.example, .gitignore, README.md, HARDWARE_SETUP.md, API_DOCUMENTATION.md, DEPLOYMENT_HANDOFF.md -DestinationPath DoorGuard_Project.zip -Force
```

---

## 10. Future Cloud Deployment (Phase 2 Preview)

When handing off to teammates for cloud hosting:
1. Cloud PostgreSQL: Deploy a free managed database on [Supabase](https://supabase.com).
2. Backend: Deploy the Flask web service on [Render](https://render.com).
3. Frontend: Deploy the static React application on [Render](https://render.com).
4. ESP32: Update `BACKEND_BASE_URL` in `config.h` to your live Render HTTPS URL.

Refer to [DEPLOYMENT_HANDOFF.md](DEPLOYMENT_HANDOFF.md) for full step-by-step instructions.

