import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado estrictamente dentro de un AuthProvider');
  }
  return context;
};

// Forzamos la exportación por defecto para que Vite no tenga problemas de resolución
export default useAuth;