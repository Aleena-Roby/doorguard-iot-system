def test_simulation_workflow_and_isolation(client):
    """
    Test simulation controls update PostgreSQL and simulation reset
    removes ONLY simulation data while strictly preserving ESP32 records.
    """
    # 1. Create a real ESP32 event
    res_esp = client.post("/api/events", json={
        "device_id": "esp32_hardware_01",
        "state": "OPEN",
        "source": "ESP32",
    })
    assert res_esp.status_code == 201

    # 2. Simulate opening door
    res_sim_open = client.post("/api/simulation/door", json={"state": "OPEN"})
    assert res_sim_open.status_code == 200
    assert res_sim_open.get_json()["current_status"]["current_state"] == "OPEN"

    # 3. Simulate closing door
    res_sim_close = client.post("/api/simulation/door", json={"state": "CLOSED"})
    assert res_sim_close.status_code == 200
    assert res_sim_close.get_json()["current_status"]["current_state"] == "CLOSED"

    # Verify both simulation and ESP32 events exist
    events_all = client.get("/api/events").get_json()
    assert events_all["total"] == 3

    # 4. Trigger simulation reset
    res_reset = client.post("/api/simulation/reset")
    assert res_reset.status_code == 200
    assert res_reset.get_json()["status"] == "success"

    # 5. Verify simulation events are deleted, but ESP32 event is preserved
    events_after = client.get("/api/events").get_json()
    assert events_after["total"] == 1
    assert events_after["events"][0]["source"] == "ESP32"
    assert events_after["events"][0]["device_id"] == "esp32_hardware_01"

