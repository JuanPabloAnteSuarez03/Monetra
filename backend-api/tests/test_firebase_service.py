import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from services.firebase_service import get_authenticated_uid, get_bearer_token

# ─────────────────────────────────────────────────────────────────────────
# Tests unitarios de get_bearer_token (no requieren red ni Firebase)
# ─────────────────────────────────────────────────────────────────────────

class _FakeRequest:
    """Doble mínimo de Request: solo necesita exponer .headers.get(...)."""
    def __init__(self, headers):
        self.headers = headers


def test_get_bearer_token_sin_authorization_header():
    request = _FakeRequest({})
    assert get_bearer_token(request) is None


def test_get_bearer_token_con_header_sin_prefijo_bearer():
    request = _FakeRequest({"Authorization": "Token abc123"})
    assert get_bearer_token(request) is None


def test_get_bearer_token_extrae_el_token_correctamente():
    request = _FakeRequest({"Authorization": "Bearer abc123"})
    assert get_bearer_token(request) == "abc123"


# ─────────────────────────────────────────────────────────────────────────
# Tests de get_authenticated_uid a través de un endpoint FastAPI real,
# igual que se hace para el resto de routers del backend.
# ─────────────────────────────────────────────────────────────────────────

@pytest.fixture
def auth_client():
    app = FastAPI()

    @app.get("/whoami")
    def whoami(request: Request):
        return {"uid": get_authenticated_uid(request)}

    return TestClient(app)


def test_sin_token_responde_401(auth_client):
    response = auth_client.get("/whoami")
    assert response.status_code == 401
    assert "token" in response.json()["detail"].lower()


def test_token_valido_devuelve_el_uid_decodificado(auth_client, monkeypatch):
    monkeypatch.setattr(
        "services.firebase_service.initialize_firebase_app", lambda: None
    )
    monkeypatch.setattr(
        "services.firebase_service.auth.verify_id_token",
        lambda token, clock_skew_seconds=10: {"uid": "uid_prueba_monetra_123"},
    )

    response = auth_client.get(
        "/whoami", headers={"Authorization": "Bearer token-valido"}
    )
    assert response.status_code == 200
    assert response.json()["uid"] == "uid_prueba_monetra_123"


def test_token_invalido_responde_401(auth_client, monkeypatch):
    def _raise(*args, **kwargs):
        raise ValueError("Token expirado")

    monkeypatch.setattr(
        "services.firebase_service.initialize_firebase_app", lambda: None
    )
    monkeypatch.setattr("services.firebase_service.auth.verify_id_token", _raise)

    response = auth_client.get(
        "/whoami", headers={"Authorization": "Bearer token-vencido"}
    )
    assert response.status_code == 401
    assert "inválido" in response.json()["detail"].lower() or "expirado" in response.json()["detail"].lower()


def test_dev_auth_permite_omitir_el_token_con_header_x_user_id(auth_client, monkeypatch):
    monkeypatch.setenv("ALLOW_DEV_AUTH", "true")

    response = auth_client.get("/whoami", headers={"x-user-id": "uid-dev-123"})
    assert response.status_code == 200
    assert response.json()["uid"] == "uid-dev-123"
