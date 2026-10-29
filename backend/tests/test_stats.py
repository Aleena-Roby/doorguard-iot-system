from datetime import datetime, timezone, timedelta


def test_empty_statistics(client):
    """Test statistics endpoint when no events exist."""
    res = client.get("/api/stats")
    assert res.status_code == 200
    data = res.get_json()
    assert data["openings_today"] == 0
    assert data["total_open_duration_seconds"] == 0.0
    assert data["longest_opening_seconds"] == 0.0
    assert len(data["activity_chart"]) == 24


def test_statistics_with_door_cycles(client):
    """Test statistics reflect completed and continuous openings."""
    t0 = datetime.now(timezone.utc) - timedelta(seconds=20)
    t1 = t0 + timedelta(seconds=12)

    # Open at t0, close at t1 (duration = 12s)
    client.post("/api/events", json={
        "device_id": "esp32_01",
        "state": "OPEN",
        "event_timestamp": t0.isoformat(),
    })
    client.post("/api/events", json={
        "device_id": "esp32_01",
        "state": "CLOSED",
        "event_timestamp": t1.isoformat(),
    })

    res = client.get("/api/stats")
    data = res.get_json()
    assert data["openings_today"] == 1
    assert data["total_open_duration_seconds"] >= 12.0
    assert data["longest_opening_seconds"] >= 12.0

