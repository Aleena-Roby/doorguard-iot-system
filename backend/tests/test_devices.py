def test_devices_crud_and_listing(client):
    """Test creating, listing, and deleting multiple devices."""
    # 1. Register device A
    res_a = client.post("/api/devices", json={
        "id": "esp32_porch_door",
        "name": "Porch Door",
        "operating_mode": "ESP32",
    })
    assert res_a.status_code == 201
    assert res_a.get_json()["device"]["id"] == "esp32_porch_door"

    # 2. Register device B
    res_b = client.post("/api/devices", json={
        "id": "esp32_garage_door",
        "name": "Garage Door",
        "operating_mode": "ESP32",
    })
    assert res_b.status_code == 201

    # 3. List devices
    res_list = client.get("/api/devices")
    assert res_list.status_code == 200
    devices = res_list.get_json()["devices"]
    device_ids = [d["id"] for d in devices]
    assert "esp32_porch_door" in device_ids
    assert "esp32_garage_door" in device_ids

    # 4. Delete device A
    res_del = client.delete("/api/devices/esp32_porch_door")
    assert res_del.status_code == 200

    # Verify device A is deleted
    res_list2 = client.get("/api/devices")
    remaining_ids = [d["id"] for d in res_list2.get_json()["devices"]]
    assert "esp32_porch_door" not in remaining_ids
    assert "esp32_garage_door" in remaining_ids

