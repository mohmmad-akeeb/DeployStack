from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient) -> None:
    """Verify root endpoint responds with online status and metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["service"] == "DeployStack"
    assert "version" in data


def test_health_endpoint(client: TestClient) -> None:
    """Verify /health endpoint returns health schema."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
    assert "environment" in data
    assert "database_connected" in data
    assert data["version"] == "0.1.0"


def test_api_v1_health_endpoint(client: TestClient) -> None:
    """Verify /api/v1/health endpoint responds identically to root /health."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
