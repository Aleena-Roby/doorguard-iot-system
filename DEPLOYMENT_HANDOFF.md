# DoorGuard Deployment & Developer Handoff Guide

This guide is written for teammates and developers receiving `DoorGuard_Project.zip`. It explains how to extract the project, run it locally, push it to a private GitHub repository, and deploy the full stack to the cloud using **Supabase** (PostgreSQL) and **Render** (Flask Backend & React Frontend).

---

## 1. Quick Checklist for Recipients

- [ ] Extract `DoorGuard_Project.zip` to a local working folder.
- [ ] Create a local `.env` and `firmware/include/config.h` from their respective `.example` files.
- [ ] Test the local application using Docker (`docker compose up`) or local Python virtualenv.
- [ ] Initialize a fresh Git repository (`git init`) and push to your personal GitHub account.
- [ ] Create a free **Supabase** project for the managed PostgreSQL cloud database.
- [ ] Deploy the **Flask backend** web service on **Render**.
- [ ] Run Alembic migrations against the Supabase database.
- [ ] Deploy the **React frontend** static site on **Render**.
- [ ] Update `BACKEND_BASE_URL` in ESP32 firmware to the live Render backend URL (`https://<your-backend>.onrender.com`).
- [ ] Flash the ESP32 and test real door events over the internet.

---

## 2. Step 1: Local Extraction & Verification

1. Extract `DoorGuard_Project.zip`.
2. Inspect the project directory structure:
   ```text
   doorguard/
   ├── frontend/         # React + Vite + TypeScript dashboard
   ├── backend/          # Flask REST API + SQLAlchemy + Alembic migrations
   ├── firmware/         # PlatformIO ESP32 C++ firmware
   ├── docker-compose.yml
   ├── .env.example
   ├── README.md
   ├── HARDWARE_SETUP.md
   ├── API_DOCUMENTATION.md
   └── DEPLOYMENT_HANDOFF.md
   ```
3. To start locally using Docker Compose:
   ```bash
   docker compose up -d
   ```
   * Frontend: `http://localhost:5173`
   * Backend: `http://localhost:5000`
   * PostgreSQL: `localhost:5432`

---

## 3. Step 2: Push to Your Personal GitHub Repository

1. Initialize Git in the project root:
   ```bash
   git init
   git add .
   git commit -m "feat: Initial commit of DoorGuard IoT Project"
   ```
2. Create a new repository on [GitHub](https://github.com/new) (e.g. `doorguard-iot-system`).
3. Set your remote and push:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/doorguard-iot-system.git
   git push -u origin main
   ```

> [!IMPORTANT]
> The supplied `.gitignore` automatically prevents your private `.env` files, Wi-Fi credentials, and `node_modules` from being pushed to GitHub.

---

## 4. Step 3: Cloud Database Setup (Supabase PostgreSQL)

1. Sign up or log in at [supabase.com](https://supabase.com/).
2. Click **New Project** and name it (e.g. `doorguard-db`).
3. Choose a strong database password and select a region close to your Render deployment.
4. Go to **Project Settings** -> **Database** -> **Connection String**.
5. Select **URI** mode and copy the connection string:
   ```text
   postgresql://postgres.[PROJECT_REF]:[YOUR_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   *(Note: DoorGuard automatically normalizes standard `postgresql://` and `postgres://` URLs to SQLAlchemy's `postgresql+psycopg://` driver scheme).*

---

## 5. Step 4: Deploy Flask Backend & Frontend to Render

You can deploy using either **Option A (Automated Render Blueprint)** or **Option B (Manual Web Service & Static Site)**.

### Option A: 1-Click Render Blueprint (Recommended)
This repository includes a pre-configured `render.yaml` Blueprint that automatically sets up both the backend web service and frontend static site together:

1. Log in to [render.com](https://render.com/).
2. Click **New +** -> **Blueprint**.
3. Connect your GitHub repository (`doorguard-iot-system`).
4. Render will read `render.yaml` and configure:
   - `doorguard-backend` (Python Flask REST API with Gunicorn)
   - `doorguard-frontend` (React + Vite Static Site with automatic SPA rewrite rules)
5. Under `doorguard-backend`, set `DATABASE_URL` to your **Supabase PostgreSQL URI**.
6. Click **Apply**. Render will automatically build the backend, apply Alembic migrations against Supabase, compile the React frontend, and bind the URLs together!

---

### Option B: Manual Setup on Render
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Configure the Web Service settings:
   * **Name:** `doorguard-backend`
   * **Root Directory:** `backend`
   * **Runtime:** `Python 3`
   * **Build Command:** `pip install -r requirements.txt && flask --app run.py db upgrade`
   * **Start Command:** `gunicorn -w 2 -b 0.0.0.0:$PORT "run:app"`
   * **Instance Type:** `Free`
5. Configure Environment Variables in Render:
   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | *Paste your Supabase URI* | Directs backend to cloud PostgreSQL |
   | `FLASK_ENV` | `production` | Disables simulation endpoints for security |
   | `SECRET_KEY` | *Generate a random 32-char key* | Protects sessions/cookies |
   | `CORS_ORIGINS` | `https://doorguard-frontend.onrender.com` | Allowed frontend origin |
   | `ALERT_DEFAULT_THRESHOLD_SECONDS` | `10` | Default alert threshold |
   | `HEARTBEAT_TIMEOUT_SECONDS` | `30` | Timeout for device offline status |
6. Click **Deploy Web Service**.
7. Once deployed, note your backend URL: `https://doorguard-backend.onrender.com`.
8. Verify health endpoint in your browser: `https://doorguard-backend.onrender.com/api/health`.

---

## 6. Step 5: Deploy React Frontend to Render

1. On Render, click **New +** -> **Static Site**.
2. Connect your GitHub repository.
3. Configure the Static Site settings:
   * **Name:** `doorguard-frontend`
   * **Root Directory:** `frontend`
   * **Build Command:** `npm install && npm run build`
   * **Publish Directory:** `dist`
4. Add an Environment Variable:
   * `VITE_API_BASE_URL`: `https://doorguard-backend.onrender.com`
5. Configure Rewrites/Redirects (for SPA routing):
   * **Type:** `Rewrite`
   * **Source:** `/*`
   * **Destination:** `/index.html`
6. Click **Create Static Site**.
7. Once live, open your frontend URL to view the live dashboard connected to Supabase!

---

## 7. Step 6: Configure ESP32 Firmware for Cloud

1. In `firmware/include/config.h`, update `BACKEND_BASE_URL`:
   ```cpp
   #define WIFI_SSID "Your_Home_WiFi"
   #define WIFI_PASSWORD "Your_WiFi_Password"
   
   // Point to your live Render backend URL over HTTPS:
   #define BACKEND_BASE_URL "https://doorguard-backend.onrender.com"
   ```
2. Compile and upload firmware to the ESP32:
   ```bash
   cd firmware
   pio run --target upload
   ```
3. Open Serial Monitor:
   ```bash
   pio device monitor -b 115200
   ```
4. Trigger the physical reed switch. Confirm that events reach your deployed Render backend and appear in real time on your hosted frontend!

---

## 8. Security & Production Best Practices

* **Device Authentication:** For open public internet deployments, consider adding an API key or bearer token header (`X-Device-Token`) in both ESP32 requests and the Flask `process_door_event` route.
* **HTTPS / TLS:** Always use HTTPS (`https://`) when connecting the ESP32 to public cloud endpoints.
* **Database Pooling:** When connecting to Supabase from serverless or scaling containers, use the Supabase Transaction Pooler (port `6543`).

