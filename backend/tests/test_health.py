def test_root_endpoint(client):
    """Test root diagnostic endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.get_json()
    assert data["name"] == "DoorGuard API"
    assert data["status"] == "online"


def test_health_endpoint_healthy(client):
    """Test health endpoint verifies PostgreSQL connectivity."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert data["database_type"] == "postgresql"
    assert "timestamp" in data

