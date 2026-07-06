// frontend/src/components/layout/BottomNav.jsx
import { useNavigate, useLocation } from 'react-router-dom';

export const BottomNav = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const ruta      = location.pathname;

  const items = [
    { path: '/dashboard', label: 'Inicio', icon: HomeIcon },
    { path: '/analisis', label: 'Análisis', icon: ChartIcon },
    { path: '/movimientos', label: 'Movimientos', icon: MovementIcon },
    { path: '/ahorros', label: 'Ahorros', icon: PigIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 flex items-end justify-around px-2 py-2">
      {items.slice(0, 2).map(item => (
        <NavButton key={item.path} item={item} ruta={ruta} onClick={() => navigate(item.path)} />
      ))}

      {/* Botón central — Registro de gasto */}
      <button
        onClick={() => navigate('/registro')}
        className={`flex flex-col items-center -mt-5 rounded-full w-14 h-14 items-center justify-center border-4 border-[#f2f4f7] transition-opacity ${
          ruta === '/registro' ? 'bg-emerald-900' : 'bg-emerald-700'
        }`}
        aria-label="Registrar gasto"
      >
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {items.slice(2).map(item => (
        <NavButton key={item.path} item={item} ruta={ruta} onClick={() => navigate(item.path)} />
      ))}
    </nav>
  );
};

const NavButton = ({ item, ruta, onClick }) => {
  const active = ruta === item.path;
  const Icon   = item.icon;
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-xs font-medium transition-colors ${
        active ? 'text-emerald-700 bg-emerald-50' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      <Icon active={active} />
      {item.label}
    </button>
  );
};

const HomeIcon  = ({ active }) => (
  <svg className={`w-5 h-5 ${active ? 'stroke-emerald-700' : 'stroke-current'}`} fill="none" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);
const ChartIcon = ({ active }) => (
  <svg className={`w-5 h-5 ${active ? 'stroke-emerald-700' : 'stroke-current'}`} fill="none" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);
const PigIcon   = ({ active }) => (
  <svg className={`w-5 h-5 ${active ? 'stroke-emerald-700' : 'stroke-current'}`} fill="none" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);
const MovementIcon = ({ active }) => (
  <svg
    className={`w-5 h-5 ${
      active ? 'stroke-emerald-700' : 'stroke-current'
    }`}
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 8v4l3 3M12 3a9 9 0 100 18 9 9 0 000-18z"
    />
  </svg>
);