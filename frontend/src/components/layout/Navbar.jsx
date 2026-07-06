// frontend/src/components/layout/Navbar.jsx
import { useState } from "react";
import useAuth from "../../hooks/useAuth";

export const Navbar = ({ seccionActiva, setSeccionActiva }) => {
  // 🌟 CORREGIDO: Extraemos 'cerrarSesion' que es el nombre real en tu contexto
  const { user, cerrarSesion } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const obtenerInicial = () => {
    if (user?.displayName) return user.displayName.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return "M";
  };

  // Módulos declarados del sistema
  const modulos = [
    { id: "dashboard", nombre: "Dashboard" },
    { id: "analisis", nombre: "Análisis" },
    { id: "ocr", nombre: "Mis Gastos (OCR)" },
    { id: "ahorros", nombre: "Ahorros" },
    { id: "ia", nombre: "Recomendaciones IA" },
  ];

  return (
    <nav className="border-b border-slate-800 bg-[#111827]/80 backdrop-blur-md sticky top-0 z-40 font-sans text-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Monetra
            </span>

            {/* 🌟 DINÁMICO: Links de Escritorio Interactivos */}
            <div className="hidden md:flex items-center gap-6 text-sm font-medium">
              {modulos.map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => setSeccionActiva(mod.id)}
                  className={`cursor-pointer px-1 py-5 transition-colors border-b-2 ${
                    seccionActiva === mod.id
                      ? "text-emerald-400 border-emerald-400 font-semibold"
                      : "text-slate-400 border-transparent hover:text-slate-200"
                  }`}
                >
                  {mod.nombre}
                </button>
              ))}
            </div>
          </div>

          {/* Menú de Perfil & Logout */}
          <div className="hidden md:flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 cursor-pointer rounded-full p-1 focus:outline-none group"
              >
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-200 max-w-[120px] truncate">
                    {user?.displayName || "Usuario Monetra"}
                  </p>
                  <p className="text-[10px] text-slate-500 max-w-[120px] truncate">
                    {user?.email}
                  </p>
                </div>
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Avatar"
                    className="h-8 w-8 rounded-full border border-slate-700 object-cover group-hover:border-emerald-400 transition-colors"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-sm font-bold text-emerald-400 group-hover:border-emerald-400 transition-colors">
                    {obtenerInicial()}
                  </div>
                )}
              </button>

              {/* Dropdown del perfil */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-800 bg-[#1f2937] p-2 shadow-2xl">
                  <div className="px-3 py-2 border-b border-slate-800 text-xs text-slate-400">
                    <span className="block font-semibold text-slate-200">
                      Mi Cuenta
                    </span>
                    <span className="block truncate mt-0.5">{user?.email}</span>
                  </div>
                  <button
                    onClick={cerrarSesion} // 🌟 CORREGIDO: Llama a cerrarSesion
                    className="mt-2 flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Botón de Menú Móvil */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-400 hover:text-white focus:outline-none"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Menú Móvil Desplegable */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-[#111827] px-4 py-3 space-y-3">
          <div className="space-y-1 text-sm font-medium text-slate-400">
            {modulos.map((mod) => (
              <button
                key={mod.id}
                onClick={() => {
                  setSeccionActiva(mod.id);
                  setMobileMenuOpen(false);
                }}
                className={`block w-full text-left rounded-lg px-3 py-2 ${
                  seccionActiva === mod.id
                    ? "bg-slate-800 text-white font-bold"
                    : "hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                {mod.nombre}
              </button>
            ))}
          </div>
          <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
            <div className="text-xs">
              <p className="font-bold text-slate-200">
                {user?.displayName || "Usuario Monetra"}
              </p>
              <p className="text-slate-500">{user?.email}</p>
            </div>
            <button
              onClick={cerrarSesion} // 🌟 CORREGIDO: Llama a cerrarSesion
              className="rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20"
            >
              Salir
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};
