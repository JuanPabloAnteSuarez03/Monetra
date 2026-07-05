from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Monetra backend funcionando"}

def test_openapi():
    response = client.get("/openapi.json")
    assert response.status_code == 200
    assert "Monetra API" in response.json().get("info", {}).get("title", "")

def test_cors_headers():
    response = client.options("/", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"})
    assert response.status_code == 200
