// frontend/src/services/financialHistoryApi.js
import { auth } from '../firebase/config';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/predictions`;

async function getAuthHeaders() {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('Usuario no autenticado');
  }

  const token = await currentUser.getIdToken(true);

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Obtiene el historial financiero del usuario autenticado.
 * Corresponde a GET /api/predictions/history en el backend,
 * que internamente llama a collect_financial_history(uid, meses, limite_movimientos).
 *
 * @param {Object} params
 * @param {number} [params.meses=6] - Cantidad de meses hacia atrás a incluir.
 * @param {number} [params.limiteMovimientos=500] - Máximo de movimientos a traer.
 * @returns {Promise<Object>} Objeto con resumenGeneral, historialMensual,
 *   promediosMensuales, tendenciaGastos, categoriasFrecuentes y movimientos.
 */
export async function getFinancialHistory({ meses, limiteMovimientos } = {}) {
  const headers = await getAuthHeaders();

  const query = new URLSearchParams();
  if (meses !== undefined) query.append('meses', meses);
  if (limiteMovimientos !== undefined) query.append('limiteMovimientos', limiteMovimientos);

  const url = query.toString() ? `${API_URL}/history?${query}` : `${API_URL}/history`;

  const response = await fetch(url, { method: 'GET', headers });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.detail || 'No fue posible obtener el historial financiero');
  }

  return result;
}
