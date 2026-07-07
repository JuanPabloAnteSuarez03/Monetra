// frontend/src/hooks/useMovements.js
import { useState, useEffect, useCallback } from 'react';
import { getMovements } from '../services/movementApi';

export const useMovements = (params = {}) => {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMovements(params);
      setMovimientos(data);
    } catch (err) {
      setError(err.message || 'Error al cargar movimientos');
    } finally {
      setLoading(false);
    }
  }, []);                           // eslint-disable-line

  useEffect(() => { fetchMovements(); }, [fetchMovements]);

  return { movimientos, setMovimientos, loading, error, refetch: fetchMovements };
};