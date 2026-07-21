// frontend/src/views/dashboard/DashboardView.jsx
import { useState, useRef, useEffect } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { useFinancialHistory } from "../../hooks/useFinancialHistory";
import { useSavings } from "../../hooks/useSavings";
import { useMovements } from "../../hooks/useMovements";
import { AppHeader } from "../../components/layout/AppHeader";
import { BottomNav } from "../../components/layout/BottomNav";
import "./DashboardView.css";

// ─── Paleta de categorías (consistente con AnalisisView) ─────────────────────
const CATEGORY_STYLE_MAP = {
  Alimentación: { icon: "🍔", color: "#22C55E", iconBg: "#DCFCE7" },
  Transporte: { icon: "🚗", color: "#3B82F6", iconBg: "#DBEAFE" },
  Salud: { icon: "❤️", color: "#EF4444", iconBg: "#FEE2E2" },
  Educación: { icon: "📚", color: "#8B5CF6", iconBg: "#EDE9FE" },
  Ocio: { icon: "🎬", color: "#7C3AED", iconBg: "#EDE9FE" },
  Vivienda: { icon: "🏠", color: "#F97316", iconBg: "#FFEDD5" },
  Servicios: { icon: "⚡", color: "#0EA5E9", iconBg: "#E0F2FE" },
  "Sin categoría": { icon: "📦", color: "#6B7280", iconBg: "#F3F4F6" },
  Compras: { icon: "🛍️", color: "#F59E0B", iconBg: "#FEF3C7" },
  Otros: { icon: "🔖", color: "#374151", iconBg: "#E5E7EB" },
};

const FALLBACK_COLORS = ["#DB2777", "#EC4899", "#A78BFA", "#2DD4BF", "#BE185D"];

// Índice normalizado (sin tildes, en minúsculas) para que el match no se
// rompa por diferencias de mayúsculas/acentos que pueda mandar el backend.
const normalizar = (str) =>
  (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const CATEGORY_STYLE_MAP_NORMALIZADO = Object.fromEntries(
  Object.entries(CATEGORY_STYLE_MAP).map(([nombre, style]) => [
    normalizar(nombre),
    style,
  ]),
);

const getCategoryStyle = (nombre, index = 0) =>
  CATEGORY_STYLE_MAP_NORMALIZADO[normalizar(nombre)] || {
    icon: "💰",
    color: FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    iconBg: "#F7FAFC",
  };

// ─── Helpers de formato ────────────────────────────────────────────────────
const formatCOP = (value) => {
  if (!value && value !== 0) return "$0";
  const sign = value < 0 ? "-" : "";
  return (
    sign +
    "$" +
    Math.round(Math.abs(value))
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  );
};

const formatRelativeTime = (fecha) => {
  if (!fecha) return "";
  const dias = Math.floor(
    (Date.now() - new Date(fecha + "T12:00:00").getTime()) / 86400000,
  );
  if (dias <= 0) return "Hoy";
  if (dias === 1) return "Ayer";
  return `Hace ${dias} días`;
};

const ICONS_BY_TIPO = {
  ingreso: { bg: "#e6f5ee", color: "#1a7a50" },
  gasto: { bg: "#fef3f0", color: "#c0392b" },
  ahorro: { bg: "#eef0ff", color: "#5c5fad" },
  deuda: { bg: "#fff7e6", color: "#c47a00" },
};

export const DashboardView = () => {
  const { user, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  // Nota: seccionActiva se mantiene solo porque AppHeader lo usa para
  // mostrar la sección "perfil" en su dropdown. BottomNav ya navega
  // con react-router (useNavigate) y no depende de este estado.
  const [seccionActiva, setSeccionActiva] = useState("dashboard");

  // ── Selector de meta a mostrar en la card de ahorro ──────────────────────
  const [metaSeleccionadaId, setMetaSeleccionadaId] = useState(null);
  const [menuMetaAbierto, setMenuMetaAbierto] = useState(false);
  const menuMetaRef = useRef(null);

  useEffect(() => {
    const handleClickFuera = (e) => {
      if (menuMetaRef.current && !menuMetaRef.current.contains(e.target)) {
        setMenuMetaAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, []);

  const obtenerPrimerNombre = () => {
    if (!user?.displayName) return "Estratega";
    return user.displayName.split(" ")[0];
  };

  // ── Datos del backend ──────────────────────────────────────────────────
  const { historial, loading: cargandoHistorial } = useFinancialHistory({
    meses: 6,
  });
  const { progresos, loading: cargandoAhorro } = useSavings();
  const { movimientos, loading: cargandoMovimientos } = useMovements({
    limit: 3,
  });

  const resumen = historial?.resumenGeneral || null;
  const balanceTotal = resumen
    ? resumen.totalIngresos - resumen.totalGastos
    : null;

  const metaPrincipal =
    (progresos || []).find((m) => m.id === metaSeleccionadaId) ||
    progresos?.[0] ||
    null;

  const ultimosMovimientos = (movimientos || []).slice(0, 3);

  // Categorías para el donut — todas las categorías reales, igual que en
  // AnalisisView (sin agrupar en "Más").
  const categoriasFrecuentes = historial?.categoriasFrecuentes || [];
  const totalCategorias =
    categoriasFrecuentes.reduce((s, c) => s + c.total, 0) || 1;

  const segmentosDonut = categoriasFrecuentes.slice(0, 8).map((cat, i) => {
    const nombre = cat.nombre || cat.categoria;
    const style = getCategoryStyle(nombre, i);
    const porcentaje = Math.round((cat.total / totalCategorias) * 100);
    return { nombre, porcentaje, color: style.color, total: cat.total };
  });

  // Construir los círculos del donut SVG (radio 38, circunferencia ≈ 238.76)
  const CIRCUMFERENCE = 2 * Math.PI * 38;
  let acumulado = 0;
  const donutCircles = segmentosDonut.map((seg) => {
    const length = (seg.porcentaje / 100) * CIRCUMFERENCE;
    const offset = -((acumulado / 100) * CIRCUMFERENCE);
    acumulado += seg.porcentaje;
    return { ...seg, dasharray: `${length} ${CIRCUMFERENCE - length}`, offset };
  });

  const irAAnalisis = () => navigate("/analisis");
  const irAMovimientos = () => navigate("/movimientos");
  const irARegistro = (tipo) => navigate("/registro", { state: { tipo } });

  const renderContenido = () => {
    switch (seccionActiva) {
      case "dashboard":
        return (
          <div className="content-section">
            {/* Greeting */}
            <div className="greeting-section">
              <h2 className="greeting-title">Hola, {obtenerPrimerNombre()}</h2>
              <p className="greeting-subtitle">
                Tu salud financiera se ve sólida hoy.
              </p>
            </div>

            {/* Balance Card — full width */}
            <div className="balance-card">
              <div className="balance-card-decoration large" />
              <div className="balance-card-decoration small" />
              <p className="balance-label">Balance Total</p>
              <p className="balance-amount">
                {cargandoHistorial ? "—" : formatCOP(balanceTotal)}
              </p>
              <div className="balance-buttons">
                <button
                  className="balance-btn"
                  onClick={() => irARegistro("ingreso")}
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Ingreso
                </button>
                <button
                  className="balance-btn"
                  onClick={() => irARegistro("gasto")}
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
                      d="M20 12H4"
                    />
                  </svg>
                  Gasto
                </button>
              </div>
            </div>

            {/* Savings + AI row */}
            <div className="grid-2col">
              {/* Savings */}
              <div className="card">
                <div className="card-header">
                  <svg
                    className="card-icon"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <div className="card-header-right">
                    <span className="card-badge">
                      {cargandoAhorro
                        ? "Meta"
                        : metaPrincipal
                          ? `Meta: ${metaPrincipal.nombre}`
                          : "Sin meta"}
                    </span>

                    {!cargandoAhorro && progresos && progresos.length > 0 && (
                      <div className="meta-selector" ref={menuMetaRef}>
                        <button
                          type="button"
                          className="meta-selector-btn"
                          aria-label="Elegir meta a mostrar"
                          onClick={() => setMenuMetaAbierto((open) => !open)}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="1.75" />
                            <circle cx="12" cy="12" r="1.75" />
                            <circle cx="12" cy="19" r="1.75" />
                          </svg>
                        </button>

                        {menuMetaAbierto && (
                          <div className="meta-dropdown-menu">
                            {progresos.map((meta) => (
                              <button
                                key={meta.id}
                                type="button"
                                className={`meta-dropdown-item${
                                  meta.id === metaPrincipal?.id ? " active" : ""
                                }`}
                                onClick={() => {
                                  setMetaSeleccionadaId(meta.id);
                                  setMenuMetaAbierto(false);
                                }}
                              >
                                <span className="meta-dropdown-item-name">
                                  {meta.nombre}
                                </span>
                                <span className="meta-dropdown-item-pct">
                                  {meta.porcentajeAvance ?? 0}%
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <p className="card-title">Progreso de Ahorro</p>
                <p className="card-subtitle">
                  {cargandoAhorro
                    ? "Cargando..."
                    : metaPrincipal
                      ? `${formatCOP(metaPrincipal.montoActual)} / ${formatCOP(metaPrincipal.montoObjetivo)}`
                      : "Aún no tienes una meta activa"}
                </p>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${metaPrincipal?.porcentajeAvance ?? 0}%`,
                    }}
                  />
                </div>
                <p className="progress-text">
                  {metaPrincipal
                    ? `${metaPrincipal.porcentajeAvance}% completado`
                    : "0% completado"}
                </p>
              </div>

              {/* AI Insights — el botón redirige a la vista de Análisis */}
              <div className="ai-card">
                <p className="ai-label">✦ AI Insights</p>
                <p className="ai-title">
                  Descubre patrones y proyecciones de tus finanzas
                </p>
                <p className="ai-description">
                  Genera un análisis con IA basado en tu historial financiero
                  real.
                </p>
                <button className="ai-btn" onClick={irAAnalisis}>
                  Ver análisis detallado
                </button>
              </div>
            </div>

            {/* Chart + Activity row */}
            <div className="grid-2col">
              {/* Donut Chart */}
              <div className="card">
                <p className="card-title" style={{ marginBottom: "1rem" }}>
                  Distribución de Gastos
                </p>
                {cargandoHistorial && (
                  <p className="card-subtitle">Cargando...</p>
                )}
                {!cargandoHistorial && segmentosDonut.length === 0 && (
                  <p className="card-subtitle">
                    Sin gastos registrados en este período.
                  </p>
                )}
                {!cargandoHistorial && segmentosDonut.length > 0 && (
                  <div className="chart-container">
                    <svg
                      width="110"
                      height="110"
                      viewBox="0 0 110 110"
                      className="chart-svg"
                    >
                      <circle
                        cx="55"
                        cy="55"
                        r="38"
                        fill="none"
                        stroke="#f0f0f0"
                        strokeWidth="16"
                      />
                      {donutCircles.map((seg) => (
                        <circle
                          key={seg.nombre}
                          cx="55"
                          cy="55"
                          r="38"
                          fill="none"
                          stroke={seg.color}
                          strokeWidth="16"
                          strokeDasharray={seg.dasharray}
                          strokeDashoffset={seg.offset}
                          transform="rotate(-90 55 55)"
                        />
                      ))}
                      <text
                        x="55"
                        y="51"
                        textAnchor="middle"
                        fontSize="10"
                        fill="#999"
                        fontFamily="sans-serif"
                      >
                        Total
                      </text>
                      <text
                        x="55"
                        y="64"
                        textAnchor="middle"
                        fontSize="13"
                        fontWeight="600"
                        fill="#222"
                        fontFamily="sans-serif"
                      >
                        {formatCOP(resumen?.totalGastos)}
                      </text>
                    </svg>
                    <div className="chart-legend">
                      {segmentosDonut.map((s) => (
                        <div key={s.nombre} className="legend-item">
                          <div
                            className="legend-dot"
                            style={{ background: s.color }}
                          />
                          {s.nombre} ({s.porcentaje}%)
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Activity */}
              <div className="card">
                <div className="activity-header">
                  <p className="activity-title">Actividad Reciente</p>
                  <button className="activity-link" onClick={irAMovimientos}>
                    Ver Todo
                  </button>
                </div>

                {cargandoMovimientos && (
                  <p className="card-subtitle">Cargando movimientos...</p>
                )}

                {!cargandoMovimientos && ultimosMovimientos.length === 0 && (
                  <p className="card-subtitle">
                    Aún no tienes movimientos registrados.
                  </p>
                )}

                {!cargandoMovimientos && ultimosMovimientos.length > 0 && (
                  <div className="activity-list">
                    {ultimosMovimientos.map((mov) => {
                      const esIngreso = mov.tipo === "ingreso";
                      const iconStyle =
                        ICONS_BY_TIPO[mov.tipo] || ICONS_BY_TIPO.gasto;
                      return (
                        <div key={mov.id} className="activity-item">
                          <div
                            className="activity-icon"
                            style={{
                              background: iconStyle.bg,
                              color: iconStyle.color,
                            }}
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
                                d={
                                  esIngreso
                                    ? "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                                    : "M21 15a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h14a2 2 0 012 2v6z"
                                }
                              />
                            </svg>
                          </div>
                          <div className="activity-info">
                            <p className="activity-name">
                              {mov.descripcion || mov.categoria}
                            </p>
                            <p className="activity-time">
                              {formatRelativeTime(mov.fecha)}
                            </p>
                          </div>
                          <p
                            className="activity-amount"
                            style={{
                              color: esIngreso ? "#1a7a50" : "#c0392b",
                            }}
                          >
                            {esIngreso ? "+" : "-"}
                            {formatCOP(mov.monto)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="dev-section">
            <p className="dev-text">Sección en desarrollo</p>
            <button
              onClick={() => setSeccionActiva("dashboard")}
              className="dev-btn"
            >
              ← Volver al inicio
            </button>
          </div>
        );
    }
  };

  return (
    <div className="dashboard-container">
      <AppHeader
        seccionActiva={seccionActiva}
        setSeccionActiva={setSeccionActiva}
      />

      <main className="dashboard-main">{renderContenido()}</main>

      <BottomNav
        seccionActiva={seccionActiva}
        setSeccionActiva={setSeccionActiva}
      />
    </div>
  );
};
