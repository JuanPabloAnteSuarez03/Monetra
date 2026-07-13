// frontend/src/views/analisis/AnalisisView.jsx
import { useState, useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { AppHeader } from "../../components/layout/AppHeader";
import { BottomNav } from "../../components/layout/BottomNav";
import { useFinancialHistory } from "../../hooks/useFinancialHistory";
import { useSavings } from "../../hooks/useSavings";
import {
  getFinancialAnalysis,
  saveFinancialRecommendations,
  getLatestRecommendation,
} from "../../services/financialAiApi";
import "./AnalisisView.css";

Chart.register(...registerables);

// ─── Paleta de categorías ──────────────────────────────────────────────────────
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

const getCategoryStyle = (nombre, index = 0) =>
  CATEGORY_STYLE_MAP[nombre] || {
    icon: "💰",
    color: FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    iconBg: "#F7FAFC",
  };

// ─── Helpers de formato ────────────────────────────────────────────────────────

const formatCOP = (value) => {
  if (!value && value !== 0) return "$0";
  return (
    "$" +
    Math.round(value)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  );
};

// Porcentaje de ingresos que se destinó a gastos en el período — ambos
// valores (totalGastos, totalIngresos) vienen del mismo resumen y la misma
// ventana de tiempo, así que el resultado es exacto, sin aproximaciones.
const calcExpenseRatio = (resumen) => {
  if (!resumen?.totalIngresos || resumen.totalIngresos === 0) return 0;
  return Math.round((resumen.totalGastos / resumen.totalIngresos) * 100);
};

const calcDailyAverage = (resumen, dias = 30) => {
  if (!resumen) return "$0";
  return formatCOP(resumen.totalGastos / dias);
};

// ─── Construcción de datos de gráfica ─────────────────────────────────────────

const buildMonthlyChartData = (historialMensual = []) => {
  const labels = historialMensual.map((m) => {
    if (!m.mes || m.mes === "sin-fecha") return "?";
    try {
      const [y, mo] = m.mes.split("-");
      return new Date(Number(y), Number(mo) - 1, 1).toLocaleString("es-CO", {
        month: "short",
      });
    } catch {
      return m.mes;
    }
  });
  return { labels, data: historialMensual.map((m) => m.gastos) };
};

const buildWeeklyChartData = (movimientos = []) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const weeks = { "Sem 1": 0, "Sem 2": 0, "Sem 3": 0, "Sem 4": 0 };

  movimientos.forEach((mov) => {
    if (mov.tipo !== "gasto" || !mov.fecha) return;
    const d = new Date(mov.fecha + "T12:00:00");
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    const day = d.getDate();
    if (day <= 7) weeks["Sem 1"] += mov.monto || 0;
    else if (day <= 14) weeks["Sem 2"] += mov.monto || 0;
    else if (day <= 21) weeks["Sem 3"] += mov.monto || 0;
    else weeks["Sem 4"] += mov.monto || 0;
  });

  return {
    labels: Object.keys(weeks),
    data: Object.values(weeks),
  };
};

// ─── Análisis anterior (simulado) ─────────────────────────────────────────────
const ANALISIS_ANTERIOR = {
  fecha: "Mayo 2025",
  contenido: `**Resumen del período — Mayo 2025**

Durante mayo registraste un gasto total de $3.800.000, un 7.3% menor al mes anterior. Tu categoría principal siguió siendo Comida y Restaurantes con $280.000, seguida de Transporte con $210.000.

**Puntos destacados:**
- Lograste reducir gastos en entretenimiento un 15% respecto a abril.
- El gasto diario promedio fue de $126.600, dentro del rango saludable.
- Tu tasa de ahorro del 16% estuvo por debajo de tu meta del 20%.

**Recomendación aplicada:** Preparar comida en casa al menos 3 veces por semana redujo tu gasto en restaurantes en $45.000 respecto a abril.`,
};

// ─── Formateador de respuesta de la IA (análisis + recomendaciones) ──────────
const formatearAnalisisIA = (analisisData = {}, recomendacionesData = {}) => {
  const partes = [];

  if (analisisData.resumenEjecutivo) {
    partes.push(`**Resumen**\n\n${analisisData.resumenEjecutivo}`);
  }

  const patrones =
    analisisData.hallazgos ?? analisisData.patronesDetectados ?? [];
  if (patrones.length) {
    const items = patrones
      .map((p) => `• ${p.titulo}: ${p.descripcion ?? p.evidencia ?? ""}`)
      .join("\n");
    partes.push(`**Lo que notamos**\n\n${items}`);
  }

  if (recomendacionesData.recomendaciones?.length) {
    const items = recomendacionesData.recomendaciones
      .map(
        (r) =>
          `• ${r.titulo}: ${r.quéHacer ?? r.accionSugerida ?? "Ver recomendación completa"}`,
      )
      .join("\n");
    partes.push(`**Consejos para ti**\n\n${items}`);
  }

  if (analisisData.diagnostico?.descripcion) {
    partes.push(`**Diagnóstico**\n\n${analisisData.diagnostico.descripcion}`);
  }

  const mensajeFinal =
    analisisData.mensajeFinal || recomendacionesData.mensajeFinal;
  if (mensajeFinal) {
    partes.push(mensajeFinal);
  }

  return (
    partes.join("\n\n") ||
    "No fue posible generar un análisis con los datos disponibles."
  );
};

const generarAnalisis = async () => {
  setEstado("loading");
  setAnalisis("");
  try {
    // saveFinancialRecommendations ya genera análisis + recomendaciones en el backend
    const resultado = await saveFinancialRecommendations({
      movimientos: historial?.movimientos || [],
      periodo: historial?.periodo || null,
    });

    // El resultado tiene data.analisis (análisis) y data.recomendaciones (recomendaciones)
    setAnalisis(
      formatearAnalisisIA(resultado.data?.analisis || {}, resultado.data || {}),
    );
    setEstado("done");
  } catch (err) {
    setAnalisis(err.message || "Ocurrió un error al generar el análisis.");
    setEstado("done");
  }
};

// ─── Modal IA ──────────────────────────────────────────────────────────────────
const ModalIA = ({ modo, onClose, historial }) => {
  const [estado, setEstado] = useState("idle");
  const [analisis, setAnalisis] = useState("");
  const esNuevo = modo === "nuevo";

  // Carga el análisis anterior desde Firestore al abrir en modo "anterior"
  useEffect(() => {
    if (modo !== "anterior") return;

    setEstado("loading");
    getLatestRecommendation().then((registro) => {
      if (!registro) {
        setAnalisis("Aún no tienes análisis guardados. Genera uno primero.");
      } else {
        const fecha = registro.creadoEn
          ? new Date(registro.creadoEn).toLocaleDateString("es-CO", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "Fecha desconocida";
        // Lee tanto el análisis anidado como las recomendaciones del data raíz
        setAnalisis(
          `**Análisis guardado — ${fecha}**\n\n` +
            formatearAnalisisIA(
              registro.data?.analisis || {}, // análisis completo
              registro.data || {}, // recomendaciones
            ),
        );
      }
      setEstado("done");
    });
  }, [modo]); // eslint-disable-line react-hooks/exhaustive-deps

  const generarAnalisis = async () => {
    setEstado("loading");
    setAnalisis("");
    try {
      const [analisisRes, recomendacionesRes] = await Promise.all([
        getFinancialAnalysis({
          movimientos: historial?.movimientos || [],
          periodo: historial?.periodo || null,
        }),
        saveFinancialRecommendations({
          // ← guarda en users/{uid}/recommendations
          movimientos: historial?.movimientos || [],
          periodo: historial?.periodo || null,
        }),
      ]);

      setAnalisis(
        formatearAnalisisIA(
          analisisRes.data || {},
          recomendacionesRes.data || {},
        ),
      );
      setEstado("done");
    } catch (err) {
      setAnalisis(
        err.message ||
          "Ocurrió un error al generar el análisis. Intenta de nuevo.",
      );
      setEstado("done");
    }
  };

  const renderTexto = (texto) =>
    texto.split("\n").map((linea, i) => {
      const partes = linea.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className={linea === "" ? "modal-spacer" : "modal-line"}>
          {partes.map((parte, j) =>
            j % 2 === 1 ? <strong key={j}>{parte}</strong> : parte,
          )}
        </p>
      );
    });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-wrap">{esNuevo ? "✨" : "📋"}</div>
            <div>
              <p className="modal-title">
                {esNuevo ? "Análisis con IA" : "Análisis Anterior"}
              </p>
              <p className="modal-subtitle">
                {esNuevo
                  ? "Generado para el período actual"
                  : "Tu último análisis guardado"}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Estado: cargando */}
          {estado === "loading" && (
            <div className="modal-loading">
              <div className="modal-spinner" />
              <p className="modal-loading-text">
                {esNuevo
                  ? "Analizando tus finanzas..."
                  : "Cargando análisis anterior..."}
              </p>
              <p className="modal-loading-sub">
                Esto puede tomar unos segundos
              </p>
            </div>
          )}

          {/* Estado: inicial (solo modo nuevo) */}
          {esNuevo && estado === "idle" && (
            <div className="modal-empty-state">
              <div className="modal-empty-icon">🤖</div>
              <p className="modal-empty-title">
                Listo para analizar tus finanzas
              </p>
              <p className="modal-empty-desc">
                La IA revisará tus gastos, categorías, metas y tendencias del
                período actual y guardará el resultado para que puedas
                consultarlo después.
              </p>
              <button className="modal-generate-btn" onClick={generarAnalisis}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Generar ahora
              </button>
            </div>
          )}

          {/* Estado: resultado */}
          {estado === "done" && (
            <div className="modal-content-text">{renderTexto(analisis)}</div>
          )}
        </div>

        {/* Footer: solo aparece cuando hay resultado */}
        {estado === "done" && (
          <div className="modal-footer">
            {esNuevo && (
              <button className="modal-retry-btn" onClick={generarAnalisis}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Regenerar análisis
              </button>
            )}
            <button className="modal-close-btn" onClick={onClose}>
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Componente principal ──────────────────────────────────────────────────────

export const AnalisisView = () => {
  const [periodo, setPeriodo] = useState("Mensual");
  const [modalModo, setModalModo] = useState(null);

  const {
    historial,
    loading: cargando,
    error,
  } = useFinancialHistory({ meses: 6 });

  const { progresos: metasAhorro, loading: cargandoMetas } = useSavings();

  // ── Selector de meta a mostrar — mismo patrón que DashboardView ─────────
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

  // Campos confirmados desde savings_goal_progress_service.py (calculate_goal_progress):
  // nombre, montoActual, montoObjetivo, porcentajeAvance (0-100, ya redondeado).
  const metaDestacada =
    (metasAhorro || []).find((m) => m.id === metaSeleccionadaId) ||
    metasAhorro?.[0] ||
    null;

  const metaNombre = metaDestacada?.nombre || "Sin meta activa";
  const metaMontoActual = metaDestacada?.montoActual ?? 0;
  const metaMontoObjetivo = metaDestacada?.montoObjetivo ?? 0;
  const metaPorcentaje = metaDestacada?.porcentajeAvance ?? 0;

  const trendRef = useRef(null);
  const donutRef = useRef(null);
  const trendChart = useRef(null);
  const donutChart = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") setModalModo(null);
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const historialMensual = historial?.historialMensual || [];
  const movimientos = historial?.movimientos || [];
  const resumen = historial?.resumenGeneral || null;
  const promedios = historial?.promediosMensuales || null;

  const datosGrafica =
    periodo === "Semanal"
      ? buildWeeklyChartData(movimientos)
      : buildMonthlyChartData(historialMensual);

  const totalGastado = formatCOP(resumen?.totalGastos);
  const gastoSobreIngresosPct = calcExpenseRatio(resumen);
  const promedioDiario = promedios
    ? formatCOP(promedios.gastoPromedioMensual / 30)
    : calcDailyAverage(resumen, 30);

  const categoriasFrecuentes = (historial?.categoriasFrecuentes || []).slice(
    0,
    3,
  );
  const maxCategoria = categoriasFrecuentes[0]?.total || 1;

  const categoriasConEstilo = categoriasFrecuentes.map((cat, i) => {
    const nombre = cat.nombre || cat.categoria;
    return {
      nombre,
      monto: formatCOP(cat.total),
      porcentaje: Math.round((cat.total / maxCategoria) * 100),
      ...getCategoryStyle(nombre, i),
    };
  });

  const todasCategorias = historial?.categoriasFrecuentes || [];
  const totalCategorias = todasCategorias.reduce((s, c) => s + c.total, 0) || 1;

  const donutCategorias = todasCategorias.slice(0, 8).map((cat, i) => {
    const nombre = cat.nombre || cat.categoria;
    const style = getCategoryStyle(nombre, i);
    return {
      nombre,
      total: cat.total,
      porcentaje: Math.round((cat.total / totalCategorias) * 100),
      color: style.color,
      icon: style.icon,
    };
  });

  const donutValues =
    donutCategorias.length > 0 ? donutCategorias.map((c) => c.total) : [1];
  const donutColors =
    donutCategorias.length > 0
      ? donutCategorias.map((c) => c.color)
      : ["#e5e7eb"];

  useEffect(() => {
    if (!donutRef.current) return;
    if (donutChart.current) {
      donutChart.current.destroy();
      donutChart.current = null;
    }

    donutChart.current = new Chart(donutRef.current, {
      type: "doughnut",
      data: {
        datasets: [
          {
            data: donutValues,
            backgroundColor: donutColors,
            borderWidth: 2,
            borderColor: "#ffffff",
          },
        ],
      },
      options: {
        responsive: false,
        cutout: "65%",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const cat = donutCategorias[ctx.dataIndex];
                return cat ? ` ${cat.nombre}: ${formatCOP(cat.total)}` : "";
              },
            },
          },
        },
      },
    });

    return () => {
      if (donutChart.current) {
        donutChart.current.destroy();
        donutChart.current = null;
      }
    };
  }, [historial]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (trendChart.current) {
      trendChart.current.destroy();
      trendChart.current = null;
    }
    if (!trendRef.current || datosGrafica.labels.length === 0) return;

    trendChart.current = new Chart(trendRef.current, {
      type: "line",
      data: {
        labels: datosGrafica.labels,
        datasets: [
          {
            data: datosGrafica.data,
            borderColor: "#1A7A4A",
            backgroundColor: "rgba(26,122,74,0.08)",
            borderWidth: 2,
            pointBackgroundColor: "#1A7A4A",
            pointRadius: 4,
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => formatCOP(ctx.raw) } },
        },
        scales: {
          x: {
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: { color: "#aaa", font: { size: 10 } },
          },
          y: {
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: {
              color: "#aaa",
              font: { size: 10 },
              callback: (v) => "$" + (v / 1_000_000).toFixed(1) + "M",
            },
          },
        },
      },
    });

    return () => {
      if (trendChart.current) {
        trendChart.current.destroy();
        trendChart.current = null;
      }
    };
  }, [periodo, historial]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-[#f2f4f7] overflow-x-hidden">
      <AppHeader seccionActiva="analisis" setSeccionActiva={() => {}} />

      <div className="analisis-wrap">
        <div className="analisis-header">
          <div>
            <p className="analisis-eyebrow">Resumen</p>
            <h2 className="analisis-title">Análisis Financiero</h2>
          </div>
          <div className="analisis-toggle">
            {["Semanal", "Mensual"].map((p) => (
              <button
                key={p}
                className={`analisis-toggle-btn${periodo === p ? " active" : ""}`}
                onClick={() => setPeriodo(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {cargando && (
          <div className="analisis-loading-banner">
            Cargando datos financieros...
          </div>
        )}
        {error && !cargando && (
          <div className="analisis-error-banner">{error}</div>
        )}

        <div className="analisis-top-row">
          <div className="analisis-card">
            <div className="analisis-chart-header">
              <div>
                <p className="analisis-chart-title">Tendencias de Gastos</p>
                <p className="analisis-chart-sub">
                  {periodo === "Semanal"
                    ? "Gastos por semana del mes actual"
                    : "Tus patrones de gasto en los últimos 6 meses"}
                </p>
              </div>
            </div>
            <div className="analisis-chart-area">
              <canvas
                ref={trendRef}
                role="img"
                aria-label="Gráfica de tendencia de gastos"
              />
            </div>
            <div className="analisis-metrics-row">
              <div>
                <p className="analisis-metric-label">Total Gastado</p>
                <p className="analisis-metric-value">
                  {cargando ? "—" : totalGastado}
                </p>
              </div>
              <div>
                <p className="analisis-metric-label">Total Ingresos</p>
                <p className="analisis-metric-value">
                  {cargando ? "—" : formatCOP(resumen?.totalIngresos)}
                </p>
              </div>
              <div>
                <p className="analisis-metric-label">Gasto sobre Ingresos</p>
                <p
                  className="analisis-metric-value"
                  style={{
                    color: cargando
                      ? undefined
                      : gastoSobreIngresosPct > 80
                        ? "#E53E3E"
                        : gastoSobreIngresosPct > 60
                          ? "#D97706"
                          : "#1A7A4A",
                  }}
                >
                  {cargando ? "—" : `${gastoSobreIngresosPct}%`}
                </p>
              </div>
              <div>
                <p
                  className="analisis-metric-label"
                  title="Calculado a partir de tu gasto promedio mensual de los últimos 6 meses, dividido entre 30 días. No es el total gastado dividido entre los días transcurridos."
                >
                  Promedio Diario de Gastos
                </p>
                <p className="analisis-metric-value">
                  {cargando ? "—" : promedioDiario}
                </p>
              </div>
            </div>
          </div>

          <div className="analisis-card">
            <p className="analisis-cat-title">Categorías Principales</p>

            {cargando && (
              <p className="analisis-loading-text">Cargando categorías...</p>
            )}

            {!cargando && categoriasConEstilo.length === 0 && (
              <p className="analisis-empty-text">
                Sin movimientos en este período.
              </p>
            )}

            {!cargando &&
              categoriasConEstilo.map((cat) => (
                <div key={cat.nombre} className="analisis-cat-item">
                  <div
                    className="analisis-cat-icon"
                    style={{ background: cat.iconBg }}
                  >
                    <span role="img" aria-hidden="true">
                      {cat.icon}
                    </span>
                  </div>
                  <div className="analisis-cat-info">
                    <p className="analisis-cat-name">{cat.nombre}</p>
                    <div className="analisis-cat-bar">
                      <div
                        className="analisis-cat-bar-fill"
                        style={{
                          width: `${cat.porcentaje}%`,
                          background: cat.color,
                        }}
                      />
                    </div>
                  </div>
                  <p className="analisis-cat-amount">{cat.monto}</p>
                </div>
              ))}

            <div className="analisis-ia-actions">
              <button
                className="analisis-ia-btn analisis-ia-btn--primary"
                onClick={() => setModalModo("nuevo")}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Generar análisis con IA
              </button>
              <button
                className="analisis-ia-btn analisis-ia-btn--secondary"
                onClick={() => setModalModo("anterior")}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Consultar análisis anterior
              </button>
            </div>
          </div>
        </div>

        <div className="analisis-bottom-row">
          <div className="analisis-card">
            <div className="analisis-goal-header">
              <p className="analisis-card-eyebrow">Meta de Ahorro</p>

              {!cargandoMetas && metasAhorro && metasAhorro.length > 1 && (
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
                      {metasAhorro.map((meta) => (
                        <button
                          key={meta.id}
                          type="button"
                          className={`meta-dropdown-item${
                            meta.id === metaDestacada?.id ? " active" : ""
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

            {cargandoMetas ? (
              <p className="analisis-loading-text">Cargando meta...</p>
            ) : !metaDestacada ? (
              <p className="analisis-empty-text">
                Aún no tienes metas de ahorro activas.
              </p>
            ) : (
              <>
                <p className="analisis-card-name">{metaNombre}</p>
                <p className="analisis-goal-amounts">
                  {formatCOP(metaMontoActual)} / {formatCOP(metaMontoObjetivo)}
                </p>
                <div className="analisis-goal-bar">
                  <div
                    className="analisis-goal-fill"
                    style={{ width: `${metaPorcentaje}%` }}
                  />
                </div>
              </>
            )}
          </div>

          <div className="analisis-card analisis-card--roomy">
            <p className="analisis-card-eyebrow">Flujo Neto del Período</p>
            <div className="analisis-subs-row">
              <div className="analisis-subs-icon">💸</div>
              <p className="analisis-subs-count">
                {cargando
                  ? "—"
                  : `${resumen?.totalMovimientos ?? 0} movimientos`}
              </p>
            </div>
            <p
              className="analisis-subs-amount"
              style={{
                color: (resumen?.flujoNeto ?? 0) >= 0 ? "#1A7A4A" : "#E53E3E",
              }}
            >
              {cargando ? "—" : formatCOP(resumen?.flujoNeto)}
            </p>
          </div>

          <div className="analisis-card analisis-card--roomy">
            <p className="analisis-card-eyebrow">Tendencia de Gastos</p>
            <div className="analisis-score-row">
              <p className="analisis-score-num">
                {historial?.tendenciaGastos?.tendencia === "aumento"
                  ? "↑"
                  : historial?.tendenciaGastos?.tendencia === "disminucion"
                    ? "↓"
                    : "→"}
              </p>
              <span className="analisis-score-badge">
                {cargando
                  ? "—"
                  : `${historial?.tendenciaGastos?.variacionPorcentual ?? 0}%`}
              </span>
            </div>
            <p className="analisis-trend-desc">
              {cargando
                ? "Calculando..."
                : historial?.tendenciaGastos?.descripcion ||
                  "Sin datos suficientes"}
            </p>
          </div>

          <div className="analisis-card">
            <p className="analisis-card-eyebrow">Distribución de Gastos</p>
            <div className="analisis-dist-row">
              <canvas
                ref={donutRef}
                width={72}
                height={72}
                role="img"
                aria-label="Distribución de gastos por categoría"
              />
              <div className="analisis-dist-legend">
                {cargando && (
                  <p className="analisis-loading-text">Cargando...</p>
                )}
                {!cargando && donutCategorias.length === 0 && (
                  <p className="analisis-empty-text">Sin datos</p>
                )}
                {!cargando &&
                  donutCategorias.map((cat) => (
                    <p key={cat.nombre} className="analisis-dist-legend-item">
                      <span
                        className="dot"
                        style={{ background: cat.color, flexShrink: 0 }}
                      />
                      <span className="analisis-dist-legend-name">
                        {cat.nombre}
                      </span>
                      <span className="analisis-dist-legend-pct">
                        {cat.porcentaje}%
                      </span>
                    </p>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />

      {modalModo && (
        <ModalIA
          modo={modalModo}
          onClose={() => setModalModo(null)}
          historial={historial}
        />
      )}
    </div>
  );
};
