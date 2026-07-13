import { useState, useRef, useEffect } from "react";
import useAuth from "../../hooks/useAuth";
import "./AppHeader.css";

export const AppHeader = ({ seccionActiva, setSeccionActiva }) => {
  const { user, cerrarSesion } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Cierra el dropdown al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="dashboard-header">
      <span className="dashboard-header-title">Monetra</span>

      <div className="header-actions">
        {/* Campana */}
        <button className="header-btn">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0.538-.214 1.055-.595 1.437L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </button>

        {/* Avatar + Dropdown */}
        <div className="avatar-dropdown" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="avatar-btn"
          >
            {user?.displayName?.charAt(0)?.toUpperCase() || "A"}
          </button>

          {dropdownOpen && (
            <div className="dropdown-menu">
              {/* Info usuario */}
              <div className="dropdown-info">
                <p className="dropdown-info-name">
                  {user?.displayName || "Usuario"}
                </p>
                <p className="dropdown-info-email">{user?.email}</p>
              </div>

              {/* Opciones */}
              <div className="dropdown-options">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    setSeccionActiva("perfil");
                  }}
                  className="dropdown-btn"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Mi perfil
                </button>

                <button onClick={cerrarSesion} className="dropdown-btn logout">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
