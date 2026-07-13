// src/hooks/useSavings.js
import { useState, useEffect, useCallback } from 'react';
import { savingsApi } from '../services/savingsApi';

export const useSavings = () => {
  const [progresos, setProgresos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadSavingsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // El UID ya no se pasa aquí, fetchAllProgress() lo maneja internamente con el token
      const data = await savingsApi.fetchAllProgress();
      if (data.exito) {
        setProgresos(data.progresos);
        setResumen(data.resumen);
      }
    } catch (err) {
      setError("Error al cargar las metas de ahorro.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSavingsData();
  }, [loadSavingsData]);

  const addGoal = async (goalData) => {
    try {
      const result = await savingsApi.createGoal({
        nombre: goalData.nombre,
        montoObjetivo: goalData.monto,
        fechaEstimada: goalData.fechaEstimada
      });
      if (result.exito) {
        await loadSavingsData(); // Recarga desde el backend para traer métricas calculadas
        return { exito: true };
      }
    } catch (err) {
      return { exito: false, error: err.message };
    }
  };

  const saveAbono = async (goalId, monto) => {
    try {
      const result = await savingsApi.registerAbono(goalId, monto);
      if (result.exito) {
        await loadSavingsData(); // Sincroniza estados y predicciones del Backend
        return { exito: true };
      }
    } catch (err) {
      return { exito: false, error: err.message };
    }
  };

  const saveRetiro = async (goalId, monto) => {
    try {
      const result = await savingsApi.registerRetiro(goalId, monto);
      if (result.exito) {
        await loadSavingsData();
        return { exito: true };
      }
    } catch (err) {
      return { exito: false, error: err.message };
    }
  };

  const deleteGoal = async (goalId) => {
    try {
      const result = await savingsApi.deleteGoal(goalId);
      if (result.exito) {
        await loadSavingsData();
        return { exito: true };
      }
    } catch (err) {
      return { exito: false, error: err.message };
    }
  };

  const updateGoal = async (goalId, goalData) => {
    try {
      const result = await savingsApi.updateGoal(goalId, goalData);
      if (result.exito) {
        await loadSavingsData();
        return { exito: true };
      }
    } catch (err) {
      return { exito: false, error: err.message };
    }
  };

  return {
    progresos,
    resumen,
    loading,
    error,
    addGoal,
    saveAbono,
    saveRetiro,
    deleteGoal,
    updateGoal,
    refresh: loadSavingsData
  };
};