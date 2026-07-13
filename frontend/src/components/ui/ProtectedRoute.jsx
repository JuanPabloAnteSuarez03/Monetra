// src/components/ui/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
          <span className="text-emerald-400/60 text-sm font-mono tracking-widest uppercase">
            Cargando...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}