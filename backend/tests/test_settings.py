def test_settings_persistence(client):
    """Test retrieving and persisting alert threshold settings in PostgreSQL."""
    res_get = client.get("/api/settings")
    assert res_get.status_code == 200
    data = res_get.get_json()
    assert "alert_threshold_seconds" in data
    assert data["alert_threshold_seconds"] == 10  # Default 10 seconds

    # Update to 30 seconds
    res_put = client.put("/api/settings", json={"alert_threshold_seconds": 30})
    assert res_put.status_code == 200
    data_put = res_put.get_json()
    assert data_put["settings"]["alert_threshold_seconds"] == 30

    # Verify persisted in subsequent GET
    res_verify = client.get("/api/settings")
    assert res_verify.get_json()["alert_threshold_seconds"] == 30


def test_invalid_settings_payload(client):
    """Test invalid settings payload returns 400 Bad Request."""
    res = client.put("/api/settings", json={"alert_threshold_seconds": -5})
    assert res.status_code == 400

    res_str = client.put("/api/settings", json={"alert_threshold_seconds": "not-an-int"})
    assert res_str.status_code == 400

