import time
from datetime import datetime, timezone, timedelta
from app.extensions import db
from app.models import Device, DoorEvent


def test_post_valid_events(client):
    """Test valid OPEN and CLOSED events from ESP32."""
    # Send OPEN event
    res1 = client.post("/api/events", json={
        "device_id": "esp32_door_sensor_01",
        "state": "OPEN",
        "sequence_number": 1,
        "source": "ESP32",
    })
    assert res1.status_code == 201
    data1 = res1.get_json()
    assert data1["status"] == "success"
    assert data1["state_changed"] is True
    assert data1["event"]["state"] == "OPEN"
    assert data1["event"]["device_id"] == "esp32_door_sensor_01"

    # Verify status is OPEN
    res_status1 = client.get("/api/status")
    assert res_status1.status_code == 200
    st1 = res_status1.get_json()
    assert st1["current_state"] == "OPEN"
    assert st1["device_id"] == "esp32_door_sensor_01"
    assert st1["is_online"] is True

    # Send CLOSED event
    res2 = client.post("/api/events", json={
        "device_id": "esp32_door_sensor_01",
        "state": "CLOSED",
        "sequence_number": 2,
        "source": "ESP32",
    })
    assert res2.status_code == 201
    data2 = res2.get_json()
    assert data2["status"] == "success"
    assert data2["state_changed"] is True
    assert data2["event"]["state"] == "CLOSED"
    assert data2["event"]["duration_seconds"] is not None

    # Verify status is now CLOSED
    res_status2 = client.get("/api/status")
    st2 = res_status2.get_json()
    assert st2["current_state"] == "CLOSED"


def test_invalid_event_payloads(client):
    """Test invalid payloads are rejected with 400 Bad Request."""
    # Not JSON
    res_none = client.post("/api/events", data="not json", content_type="text/plain")
    assert res_none.status_code == 400

    # Missing state
    res_missing = client.post("/api/events", json={"device_id": "esp32_01"})
    assert res_missing.status_code == 400

    # Invalid state value
    res_invalid_val = client.post("/api/events", json={"device_id": "esp32_01", "state": "AJAR"})
    assert res_invalid_val.status_code == 400


def test_idempotent_event_deduplication(client):
    """Test events with identical idempotency_key are deduplicated safely."""
    payload = {
        "device_id": "esp32_door_sensor_01",
        "state": "OPEN",
        "idempotency_key": "unique_msg_uuid_999",
    }
    res1 = client.post("/api/events", json=payload)
    assert res1.status_code == 201
    event_id1 = res1.get_json()["event"]["id"]

    # Send exact same idempotent key again
    res2 = client.post("/api/events", json=payload)
    assert res2.status_code in (200, 201)
    event_id2 = res2.get_json()["event"]["id"]
    assert event_id1 == event_id2

    # Verify total events count is 1
    res_list = client.get("/api/events")
    assert res_list.get_json()["total"] == 1


def test_heartbeat_and_device_online_status(client):
    """Test heartbeat updates last_seen_at and online determination."""
    # Send heartbeat
    res = client.post("/api/heartbeat", json={
        "device_id": "esp32_door_sensor_01",
        "mode": "ESP32",
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert data["device"]["operating_mode"] == "ESP32"

    # Status check confirms online
    st = client.get("/api/status").get_json()
    assert st["is_online"] is True
    assert st["device_id"] == "esp32_door_sensor_01"


def test_alert_threshold_behavior(client):
    """Test alert triggers when door remains open past configured threshold."""
    # Set threshold to 2 seconds for test
    client.put("/api/settings", json={"alert_threshold_seconds": 2})

    # Post OPEN event with timestamp 3 seconds ago
    past_time = (datetime.now(timezone.utc) - timedelta(seconds=3)).isoformat()
    client.post("/api/events", json={
        "device_id": "esp32_door_sensor_01",
        "state": "OPEN",
        "event_timestamp": past_time,
    })

    # Status should have is_alert_active = True
    st = client.get("/api/status").get_json()
    assert st["current_state"] == "OPEN"
    assert st["open_duration_seconds"] >= 2.0
    assert st["is_alert_active"] is True

    # Now close door
    client.post("/api/events", json={
        "device_id": "esp32_door_sensor_01",
        "state": "CLOSED",
    })

    # Alert must clear immediately upon closure
    st_closed = client.get("/api/status").get_json()
    assert st_closed["current_state"] == "CLOSED"
    assert st_closed["is_alert_active"] is False


def test_events_export_csv(client):
    """Test CSV export endpoint returns proper CSV headers and rows."""
    client.post("/api/events", json={"device_id": "esp32_01", "state": "OPEN"})
    client.post("/api/events", json={"device_id": "esp32_01", "state": "CLOSED"})

    res = client.get("/api/events/export")
    assert res.status_code == 200
    assert res.content_type.startswith("text/csv")
    csv_text = res.get_data(as_text=True)
    assert "Event ID" in csv_text
    assert "State" in csv_text
    assert "OPEN" in csv_text
    assert "CLOSED" in csv_text

