// frontend/src/hooks/useFinancialHistory.js
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getFinancialHistory } from '../services/financialHistoryApi';

/**
 * Hook para obtener el historial financiero del usuario autenticado.
 * Espera a que useAuth resuelva el usuario actual antes de hacer el fetch,
 * para evitar llamadas sin token válido.
 *
 * @param {Object} params
 * @param {number} [params.meses=6]
 * @param {number} [params.limiteMovimientos=500]
 */
export const useFinancialHistory = (params = {}) => {
  const { user, loading: authLoading } = useAuth();

  const [historial, setHistorial] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const { meses, limiteMovimientos } = params;

  const fetchHistorial = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getFinancialHistory({ meses, limiteMovimientos });
      setHistorial(data);
    } catch (err) {
      setError(err.message || 'Error al cargar el historial financiero');
    } finally {
      setLoading(false);
    }
  }, [user, meses, limiteMovimientos]);

  useEffect(() => {
    // Si auth todavía está resolviendo, no hacemos nada aún.
    if (authLoading) return;

    // Si terminó de cargar auth y no hay usuario, no hay nada que pedir.
    if (!user) {
      setLoading(false);
      return;
    }

    fetchHistorial();
  }, [authLoading, user, fetchHistorial]);

  return { historial, setHistorial, loading: authLoading || loading, error, refetch: fetchHistorial };
};

export default useFinancialHistory;
