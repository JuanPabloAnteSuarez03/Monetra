import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
import sys
import os

# Asegurar que el directorio raíz 'backend-api' esté en el path de Python
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

@pytest.fixture(autouse=True)
def mock_global_auth(monkeypatch):
    """
    Simula de forma automática que el usuario siempre está autenticado,
    parcheando la función importada en los routers clave.
    """
    mock_uid = MagicMock(return_value="uid_prueba_monetra_123")

    # Lista de lugares donde importas directamente get_authenticated_uid
    routers_to_patch = [
        "routers.movements_router.get_authenticated_uid",
        "routers.ai_router.get_authenticated_uid",
        "routers.predictions_router.get_authenticated_uid",
        "routers.reports_router.get_authenticated_uid",
        "routers.savings_goals_router.get_authenticated_uid"
    ]

    for target in routers_to_patch:
        try:
            monkeypatch.setattr(target, mock_uid)
        except (AttributeError, ImportError):
            # Si un router aún no usa la función o no está cargado, ignora el error
            pass

    return mock_uid
