import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import './LoginView.css';

export const LoginView = () => {
  const { loginConGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setError('');
    try {
      await loginConGoogle();
      navigate('/dashboard');
    } catch {
      setError('Error al autenticar con Google. Inténtalo de nuevo.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-logo">
          <div className="login-logo__icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="white" strokeWidth="1.5"/>
              <path d="M7 12h10M7 8h6M7 16h8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="login-logo__title">Monetra</h1>
          <p className="login-logo__subtitle">Empoderamiento financiero a través de la claridad.</p>
        </div>

        {error && <p className="login-error">{error}</p>}

        <button className="login-google-btn" onClick={handleGoogleLogin}>
          <svg viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 11.3v2.9h4.6c-.2 1.1-1.3 3.1-4.6 3.1-2.9 0-5.3-2.4-5.3-5.4s2.4-5.4 5.3-5.4c1.7 0 2.8.7 3.4 1.3l2.2-2.1C16 4.5 14.2 3.7 12 3.7 7.6 3.7 4 7.4 4 11.9s3.6 8.1 8 8.1c4.6 0 7.6-3.2 7.6-7.8 0-.5 0-.9-.1-1.2H12z"/>
          </svg>
          Continuar con Google
        </button>

        <p className="login-footer">
          © 2026 Monetra Soluciones financieras. Todos los derechos reservados.
        </p>

      </div>
    </div>
  );
};