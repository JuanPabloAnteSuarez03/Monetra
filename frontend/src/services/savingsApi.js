// src/services/savingsApi.js
import { auth } from '../firebase/config';

// Se acopla a la configuración de variables de entorno igual que movementApi
const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/savings-goals`;

/**
 * Obtiene los headers dinámicos directamente desde el SDK de Firebase
 */
async function getAuthHeaders() {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('Usuario no autenticado');
  }

  // Fuerza la actualización del token para evitar expiraciones accidentales
  const token = await currentUser.getIdToken(true);

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export const savingsApi = {
  
  // 1. CONECTA CON: GET /api/savings-goals/progress/all
  async fetchAllProgress() {
    console.log("Consultando el progreso real de ahorros en FastAPI (Fetch)...");
    const headers = await getAuthHeaders();

    // Agregamos el query param soloActivas=true para cumplir con tu FastAPI router
    const response = await fetch(`${API_URL}/progress/all?soloActivas=true`, {
      method: 'GET',
      headers,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || 'No fue posible obtener el progreso de ahorros');
    }

    // Adaptamos la respuesta para que la lea correctamente el Hook useSavings
    return {
      exito: true,
      resumen: result.resumen || { promedioAvanceGeneral: result.promedioAvanceGeneral || 0 },
      progresos: result.progresos || result.metas || []
    };
  },

  // 2. CONECTA CON: POST /api/savings-goals/
  async createGoal(goalData) {
    console.log("Enviando creación de meta a FastAPI (Fetch):", goalData);
    const headers = await getAuthHeaders();

    const payload = {
      nombre: goalData.nombre,
      montoObjetivo: parseFloat(goalData.montoObjetivo), // Se mapea con SavingsGoalCreate en Python
      fechaEstimada: goalData.fechaEstimada
    };

    const response = await fetch(`${API_URL}/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail?.mensaje || 'No fue posible crear la meta de ahorro');
    }

    return {
      exito: true,
      meta: result
    };
  },

  // 3. CONECTA CON: POST /api/savings-goals/{goal_id}/abonos
  async registerAbono(goalId, monto) {
    console.log(`Enviando abono de $${monto} para la meta ${goalId} a FastAPI (Fetch)...`);
    const headers = await getAuthHeaders();

    const payload = {
      monto: parseFloat(monto) // Se mapea con AbonoCreate en Python
    };

    const response = await fetch(`${API_URL}/${goalId}/abonos`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || 'No fue posible registrar el abono');
    }

    return {
      exito: true,
      abono: result
    };
  },

  // 4. CONECTA CON: POST /api/savings-goals/{goal_id}/retiros
  async registerRetiro(goalId, monto) {
    console.log(`Enviando retiro de $${monto} para la meta ${goalId} a FastAPI (Fetch)...`);
    const headers = await getAuthHeaders();

    const payload = {
      monto: parseFloat(monto) // Se mapea con RetiroCreate en Python
    };

    const response = await fetch(`${API_URL}/${goalId}/retiros`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || 'No fue posible registrar el retiro');
    }

    return {
      exito: true,
      retiro: result
    };
  },

  // 5. CONECTA CON: DELETE /api/savings-goals/{goal_id}
  async deleteGoal(goalId) {
    console.log(`Eliminando meta ${goalId} en FastAPI (Fetch)...`);
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}/${goalId}?confirmar=true`, {
      method: 'DELETE',
      headers,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || 'No fue posible eliminar la meta');
    }

    return {
      exito: true,
      eliminado: result
    };
  },

  // 6. CONECTA CON: PUT /api/savings-goals/{goal_id}
  async updateGoal(goalId, goalData) {
    console.log(`Actualizando meta ${goalId} en FastAPI (Fetch)...`);
    const headers = await getAuthHeaders();

    const payload = {};
    if (goalData.nombre !== undefined) payload.nombre = goalData.nombre;
    if (goalData.montoObjetivo !== undefined) payload.montoObjetivo = parseFloat(goalData.montoObjetivo);
    if (goalData.fechaEstimada !== undefined) payload.fechaEstimada = goalData.fechaEstimada;
    if (goalData.descripcion !== undefined) payload.descripcion = goalData.descripcion;
    if (goalData.moneda !== undefined) payload.moneda = goalData.moneda;
    if (goalData.estado !== undefined) payload.estado = goalData.estado;

    const response = await fetch(`${API_URL}/${goalId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || 'No fue posible actualizar la meta');
    }

    return {
      exito: true,
      meta: result
    };
  }
};