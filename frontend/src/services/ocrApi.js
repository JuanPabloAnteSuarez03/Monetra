// frontend/src/services/ocrApi.js
import { auth } from '../firebase/config';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function scanInvoice(file) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('Debes iniciar sesión para escanear facturas.');
  }

  const token = await currentUser.getIdToken(true);

  const formData = new FormData();
  formData.append('file', file);

  let response;
  try {
    response = await fetch(`${API_URL}/ocr/scan-invoice`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
  } catch (_) {
    throw new Error('No se pudo conectar con el servidor. ¿Está corriendo el backend en localhost:8000?');
  }

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.detail || `Error del servidor (${response.status})`);
  }

  return result;
}