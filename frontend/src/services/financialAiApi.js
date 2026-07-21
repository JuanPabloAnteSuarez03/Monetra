import { auth } from '../firebase/config';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/ai`;

async function getAuthHeaders() {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Usuario no autenticado');
  const token = await currentUser.getIdToken(true);
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function getFinancialAnalysis({ movimientos = [], periodo = null } = {}) {
  const headers = await getAuthHeaders();
  const body = {
    periodo,
    movimientos: movimientos.map((m) => ({
      tipo: m.tipo,
      monto: m.monto,
      categoria: m.categoria,
      fecha: m.fecha,
      descripcion: m.descripcion,
      origen: m.origen,
    })),
    casoUso: 'analisis_financiero',
    limiteMovimientos: 50,
    permitirRespaldoLocal: true,
  };
  const response = await fetch(`${API_URL}/analysis`, {
    method: 'POST', headers, body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.detail || 'No fue posible generar el análisis financiero');
  return result;
}

export async function getFinancialRecommendations({ movimientos = [], periodo = null } = {}) {
  const headers = await getAuthHeaders();
  const body = {
    periodo,
    movimientos: movimientos.map((m) => ({
      tipo: m.tipo,
      monto: m.monto,
      categoria: m.categoria,
      fecha: m.fecha,
      descripcion: m.descripcion,
      origen: m.origen,
    })),
    casoUso: 'recomendaciones_financieras',
    limiteMovimientos: 50,
    permitirRespaldoLocal: true,
  };
  const response = await fetch(`${API_URL}/recommendations`, {
    method: 'POST', headers, body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.detail || 'No fue posible generar las recomendaciones');
  return result;
}

export async function saveFinancialRecommendations({ movimientos = [], periodo = null } = {}) {
  const headers = await getAuthHeaders();
  const body = {
    periodo,
    movimientos: movimientos.map((m) => ({
      tipo: m.tipo,
      monto: m.monto,
      categoria: m.categoria,
      fecha: m.fecha,
      descripcion: m.descripcion,
      origen: m.origen,
    })),
    casoUso: 'recomendaciones_financieras',
    limiteMovimientos: 50,
    permitirRespaldoLocal: true,
  };
  const response = await fetch(`${API_URL}/recommendations/save`, {
    method: 'POST', headers, body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.detail || 'No fue posible guardar las recomendaciones');
  return result;
}

export async function getLatestRecommendation() {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/recommendations/history?limite=1`, {
    method: 'GET', headers,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.detail || 'No fue posible obtener el historial');
  return result.recomendaciones?.[0] || null;
}