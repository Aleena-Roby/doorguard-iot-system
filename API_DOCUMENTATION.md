# DoorGuard REST API Documentation

This document provides a comprehensive technical specification for the DoorGuard backend REST API. The backend is implemented with Python, Flask, SQLAlchemy, Psycopg 3, and PostgreSQL.

---

## Base URL
* Local Host: `http://localhost:5000`
* LAN Network: `http://<YOUR_COMPUTER_LAN_IP>:5000` (e.g., `http://192.168.1.8:5000`)
* API Prefix: `/api`

---

## 1. System Health & Connectivity

### `GET /api/health`
Verifies backend operational status and active PostgreSQL database connectivity.

#### Response (200 OK):
```json
{
  "status": "healthy",
  "database": "connected",
  "database_type": "postgresql",
  "database_version": "PostgreSQL 16.8 on x86_64-pc-linux-musl, compiled by gcc (Alpine 14.2.0) 14.2.0, 64-bit",
  "timestamp": "2026-10-29T00:15:30.123456+00:00"
}
```

#### Error Response (503 Service Unavailable):
```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "database_type": "postgresql",
  "error": "Failed to connect to PostgreSQL database",
  "timestamp": "2026-10-29T00:15:30.123456+00:00"
}
```

---

## 2. Door Monitoring Status

### `GET /api/status`
Returns real-time door state, continuous open duration, active security alert evaluation, and microcontroller connectivity.

#### Query Parameters:
* `device_id` (optional, string): Filter by specific device ID. If omitted, returns the most recently active device.

#### Response (200 OK):
```json
{
  "device_id": "esp32_door_sensor_01",
  "device_name": "Main Entrance Door",
  "current_state": "OPEN",
  "operating_mode": "ESP32",
  "is_online": true,
  "open_duration_seconds": 14.2,
  "is_alert_active": true,
  "alert_threshold_seconds": 10,
  "heartbeat_timeout_seconds": 30,
  "last_opened_at": "2026-10-29T00:15:15.800000+00:00",
  "last_event_at": "2026-10-29T00:15:15.800000+00:00",
  "last_seen_at": "2026-10-29T00:15:25.000000+00:00",
  "server_time": "2026-10-29T00:15:30.000000+00:00"
}
```

---

## 3. Ingesting Door State Events

### `POST /api/events`
Ingests physical state transitions from the ESP32 firmware or API clients. Performs input validation, deduplication, timestamp ordering, and duration calculation.

#### Request Headers:
`Content-Type: application/json`

#### Request Body:
```json
{
  "device_id": "esp32_door_sensor_01",
  "state": "OPEN",
  "source": "ESP32",
  "sequence_number": 101,
  "event_timestamp": "2026-10-29T00:15:15.800000Z",
  "idempotency_key": "optional-unique-uuid-or-hash"
}
```

#### Field Specifications:
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `state` | string | **Yes** | Must be `"OPEN"` or `"CLOSED"` (case-insensitive). |
| `device_id` | string | No | Microcontroller ID. Defaults to `"esp32_door_sensor_01"`. |
| `source` | string | No | `"ESP32"` (hardware) or `"SIMULATION"`. Defaults to `"ESP32"`. |
| `sequence_number` | integer | No | Monotonically increasing sequence from ESP32. |
| `event_timestamp` | string/number | No | Event timestamp (ISO 8601 or Unix timestamp). Defaults to server UTC now. |
| `idempotency_key` | string | No | Unique key preventing duplicate processing. |

#### Response (201 Created):
```json
{
  "status": "success",
  "state_changed": true,
  "event": {
    "id": 42,
    "device_id": "esp32_door_sensor_01",
    "state": "OPEN",
    "source": "ESP32",
    "event_timestamp": "2026-10-29T00:15:15.800000+00:00",
    "server_received_at": "2026-10-29T00:15:15.850000+00:00",
    "duration_seconds": null,
    "sequence_number": 101,
    "idempotency_key": null
  }
}
```

---

## 4. Heartbeat Telemetry

### `POST /api/heartbeat`
Used by the ESP32 to keep the device status `is_online = true`. Transmitted periodically (~every 10 seconds).

#### Request Body:
```json
{
  "device_id": "esp32_door_sensor_01",
  "mode": "ESP32"
}
```

#### Response (200 OK):
```json
{
  "status": "success",
  "device": {
    "id": "esp32_door_sensor_01",
    "name": "Main Entrance Door",
    "current_state": "CLOSED",
    "operating_mode": "ESP32",
    "last_seen_at": "2026-10-29T00:15:30.000000+00:00",
    "created_at": "2026-10-29T00:00:00.000000+00:00",
    "updated_at": "2026-10-29T00:15:30.000000+00:00"
  },
  "server_time": "2026-10-29T00:15:30.000000+00:00"
}
```

---

## 5. Event History Query

### `GET /api/events`
Retrieves paginated historical door events stored in PostgreSQL.

#### Query Parameters:
* `page` (integer, default: 1): Page number.
* `limit` (integer, default: 50, max: 200): Results per page.
* `source` (string, optional): Filter by `"ESP32"` or `"SIMULATION"`.
* `state` (string, optional): Filter by `"OPEN"` or `"CLOSED"`.
* `device_id` (string, optional): Filter by specific device ID.

#### Response (200 OK):
```json
{
  "total": 128,
  "page": 1,
  "limit": 50,
  "events": [
    {
      "id": 128,
      "device_id": "esp32_door_sensor_01",
      "state": "CLOSED",
      "source": "ESP32",
      "event_timestamp": "2026-10-29T00:15:45.000000+00:00",
      "server_received_at": "2026-10-29T00:15:45.050000+00:00",
      "duration_seconds": 29.2,
      "sequence_number": 102,
      "idempotency_key": null
    }
  ]
}
```

---

## 6. Daily Statistics & Analytics

### `GET /api/stats`
Returns aggregated daily metrics and 24-hour activity distribution for charting.

#### Response (200 OK):
```json
{
  "date": "2026-10-29",
  "openings_today": 12,
  "total_open_duration_seconds": 184.5,
  "longest_opening_seconds": 45.2,
  "current_open_duration_seconds": 0.0,
  "events_count_today": 24,
  "activity_chart": [
    { "hour": "00:00", "openings": 2, "duration_seconds": 25.0 },
    { "hour": "01:00", "openings": 0, "duration_seconds": 0.0 }
  ]
}
```

---

## 7. Application Settings

### `GET /api/settings`
Retrieves current global settings persisted in PostgreSQL `app_settings` table.

#### Response (200 OK):
```json
{
  "alert_threshold_seconds": 10,
  "heartbeat_timeout_seconds": 30,
  "active_device_id": "esp32_door_sensor_01"
}
```

### `PUT /api/settings`
Updates settings in PostgreSQL.

#### Request Body:
```json
{
  "alert_threshold_seconds": 30
}
```

#### Response (200 OK):
```json
{
  "status": "success",
  "updated": {
    "alert_threshold_seconds": 30
  },
  "settings": {
    "alert_threshold_seconds": 30,
    "heartbeat_timeout_seconds": 30,
    "active_device_id": "esp32_door_sensor_01"
  }
}
```

---

## 8. CSV Export

### `GET /api/events/export`
Generates and downloads a complete CSV file of all recorded events from PostgreSQL.

#### Headers Returned:
* `Content-Type: text/csv; charset=utf-8`
* `Content-Disposition: attachment; filename=doorguard_events_YYYYMMDD_HHMMSS.csv`

---

## 9. Simulation & Testing

> [!NOTE]
> Simulation endpoints are only enabled when `ALLOW_SIMULATION=true` (development/testing modes). In production, they return `403 Forbidden`.

### `POST /api/simulation/door`
Simulates a door transition without hardware. Processes through the same database service layer.

#### Request Body:
```json
{
  "state": "OPEN"
}
```

### `POST /api/simulation/reset`
Purges simulation events from PostgreSQL while strictly preserving all real ESP32 hardware logs and application settings.

#### Response (200 OK):
```json
{
  "status": "success",
  "deleted_events": 8,
  "message": "Successfully reset simulation. Deleted 8 simulated events."
}
```

---

## 10. Multi-Device Management

### `GET /api/devices`
Retrieves a list of all registered door devices from PostgreSQL.

#### Response (200 OK):
```json
{
  "devices": [
    {
      "id": "esp32_front_door",
      "name": "Front Door",
      "current_state": "CLOSED",
      "operating_mode": "ESP32",
      "is_online": true,
      "last_event_at": "2026-10-29T00:15:30.123456+00:00",
      "last_seen_at": "2026-10-29T00:15:30.123456+00:00",
      "created_at": "2026-10-28T19:29:48.383062+00:00"
    }
  ]
}
```

### `POST /api/devices`
Registers a new door monitoring device or physical ESP32 node.

#### Request Body:
```json
{
  "id": "esp32_kitchen_door",
  "name": "Kitchen Back Door",
  "operating_mode": "ESP32"
}
```

#### Response (201 Created):
```json
{
  "status": "success",
  "device": {
    "id": "esp32_kitchen_door",
    "name": "Kitchen Back Door",
    "current_state": "CLOSED",
    "operating_mode": "ESP32",
    "is_online": false,
    "last_event_at": null,
    "last_seen_at": null,
    "created_at": "2026-10-29T01:10:00.000000+00:00"
  }
}
```

### `DELETE /api/devices/<device_id>`
Unregisters a door monitoring device and purges its events from PostgreSQL.

#### Response (200 OK):
```json
{
  "status": "success",
  "message": "Device 'esp32_kitchen_door' deleted successfully."
}
```

