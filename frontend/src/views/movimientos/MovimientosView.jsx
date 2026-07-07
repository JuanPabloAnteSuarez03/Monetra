import { useState, useMemo } from "react";
import { AppHeader } from "../../components/layout/AppHeader";
import { BottomNav } from "../../components/layout/BottomNav";
import { MovementCard } from "../../components/movimientos/MovementCard";
import { MovementOptionsModal } from "../../components/movimientos/MovementOptionsModal";
import { useMovements } from "../../hooks/useMovements";
import { updateMovement, deleteMovement } from "../../services/movementApi";
import "./MovimientosView.css";

// ── Helpers visuales ──────────────────────────────────────────────────────
const CATEGORY_MAP = {
  Alimentación: { emoji: "🍔", color: "#10b981" },
  Transporte: { emoji: "🚗", color: "#3b82f6" },
  Ocio: { emoji: "🎬", color: "#8b5cf6" },
  Salud: { emoji: "❤️", color: "#ef4444" },
  Compras: { emoji: "🛍️", color: "#f59e0b" },
  Servicios: { emoji: "⚡", color: "#06b6d4" },
  Vivienda: { emoji: "🏠", color: "#84cc16" },
  Educación: { emoji: "📚", color: "#a855f7" },
  Sueldo: { emoji: "💼", color: "#16a34a" },
  "Ingreso extra": { emoji: "➕", color: "#22c55e" },
  "Sin categoría": { emoji: "📋", color: "#6b7280" },
};

const enrichMovimiento = (mov) => {
  const cat = CATEGORY_MAP[mov.categoria] || CATEGORY_MAP["Sin categoría"];
  return {
    ...mov,
    icono: cat.emoji,
    color: cat.color,
    hora: mov.fecha || "",
  };
};

export const MovimientosView = () => {
  const { movimientos, setMovimientos, loading, error, refetch } =
    useMovements();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState(null);
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [seccionActiva, setSeccionActiva] = useState("movimientos");
  const [selectedMovement, setSelectedMovement] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [actionError, setActionError] = useState("");

  // ── Enriquecer con datos visuales ──────────────────────────────────────
  const enrichedMovimientos = useMemo(
    () => movimientos.map(enrichMovimiento),
    [movimientos],
  );

  // ── Guardar cambios (edición) ──────────────────────────────────────────
  const handleSave = async (updatedMovement) => {
    try {
      const saved = await updateMovement(updatedMovement.id, {
        tipo: updatedMovement.tipo,
        monto: updatedMovement.monto,
        categoria: updatedMovement.categoria,
        descripcion: updatedMovement.descripcion,
      });

      setMovimientos((prev) =>
        prev.map((m) => (m.id === saved.id ? saved : m)),
      );
      setSelectedMovement(null);
      flash("✅ Movimiento actualizado correctamente.", "ok");
    } catch (err) {
      setActionError(err.message || "No se pudo actualizar el movimiento.");
    }
  };

  // ── Eliminar ───────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await deleteMovement(id);
      setMovimientos((prev) => prev.filter((m) => m.id !== id));
      setSelectedMovement(null);
      flash("🗑️ Movimiento eliminado correctamente.", "ok");
    } catch (err) {
      setActionError(err.message || "No se pudo eliminar el movimiento.");
    }
  };

  const flash = (msg, type) => {
    if (type === "ok") {
      setSuccessMessage(msg);
      setActionError("");
    }
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  // ── Filtrar / ordenar / agrupar ────────────────────────────────────────
  const groupedMovements = useMemo(() => {
    let filtered = enrichedMovimientos;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.descripcion?.toLowerCase().includes(q) ||
          m.categoria?.toLowerCase().includes(q),
      );
    }

    if (filterType === "fecha") {
      filtered = [...filtered].sort((a, b) => {
        const diff = new Date(b.fecha) - new Date(a.fecha);
        return sortOrder === "desc" ? diff : -diff;
      });
    } else if (filterType === "monto") {
      filtered = [...filtered].sort((a, b) =>
        sortOrder === "desc" ? b.monto - a.monto : a.monto - b.monto,
      );
    } else if (filterType === "categoria" && selectedCategory) {
      filtered = filtered.filter((m) => m.categoria === selectedCategory);
    }
    // Agrupar por fecha (YYYY-MM-DD)
    const groups = {};
    filtered.forEach((m) => {
      const key = m.fecha || "sin-fecha";

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(m);
    });

    // Ordenar cada grupo por fecha de creación (más reciente primero)
    Object.keys(groups).forEach((key) => {
      groups[key].sort(
        (a, b) => new Date(b.creadoEn) - new Date(a.creadoEn)
      );
    });

    return groups;
  }, [
    enrichedMovimientos,
    searchTerm,
    filterType,
    sortOrder,
    selectedCategory,
  ]);

  const uniqueCategories = [...new Set(movimientos.map((m) => m.categoria))];

  const handleFilterClick = (type) => {
    if (filterType === type) {
      if (type === "fecha" || type === "monto") {
        setSortOrder((o) => (o === "desc" ? "asc" : "desc"));
      } else {
        setFilterType(null);
        setSelectedCategory(null);
      }
    } else {
      setFilterType(type);
      setSortOrder("desc");
      if (type !== "categoria") setSelectedCategory(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === "sin-fecha") return "Sin fecha";
    const date = new Date(dateStr + "T12:00:00");
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Hoy";
    if (date.toDateString() === yesterday.toDateString()) return "Ayer";
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "long",   year: "numeric",});
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="mv-container">
      <AppHeader
        seccionActiva={seccionActiva}
        setSeccionActiva={setSeccionActiva}
      />

      {/* Banners */}
      {successMessage && (
        <div className="mv-success-banner">{successMessage}</div>
      )}
      {actionError && (
        <div
          className="mv-success-banner"
          style={{
            background: "#fef2f2",
            color: "#dc2626",
            borderColor: "#fecaca",
          }}
        >
          {actionError}
        </div>
      )}

      {/* Barra de búsqueda + filtros */}
      <div className="mv-search-section">
        <div className="mv-search-bar">
          <input
            type="text"
            placeholder="Buscar movimientos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mv-search-input"
          />
        </div>

        <div className="mv-filters">
          <button
            className={`mv-filter-btn ${filterType === "fecha" ? "active" : ""}`}
            onClick={() => handleFilterClick("fecha")}
          >
            Fecha {filterType === "fecha" && (sortOrder === "desc" ? "↓" : "↑")}
          </button>
          <button
            className={`mv-filter-btn ${filterType === "categoria" ? "active" : ""}`}
            onClick={() => handleFilterClick("categoria")}
          >
            Categoría
          </button>
          <button
            className={`mv-filter-btn ${filterType === "monto" ? "active" : ""}`}
            onClick={() => handleFilterClick("monto")}
          >
            Monto {filterType === "monto" && (sortOrder === "desc" ? "↓" : "↑")}
          </button>
        </div>

        {filterType === "categoria" && (
          <div className="mv-category-dropdown">
            <select
              value={selectedCategory || ""}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="mv-category-select"
            >
              <option value="">Todas las categorías</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Contenido principal */}
      <main className="mv-main">
        {/* Estado de carga */}
        {loading && (
          <div
            style={{ textAlign: "center", padding: "3rem 0", color: "#6b7280" }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "3px solid #e5e7eb",
                borderTopColor: "#1a7a50",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 1rem",
              }}
            />
            Cargando movimientos...
          </div>
        )}

        {/* Error de carga */}
        {error && !loading && (
          <div style={{ textAlign: "center", padding: "3rem 0" }}>
            <p style={{ color: "#dc2626", marginBottom: "1rem" }}>
              No se pudieron cargar los movimientos: {error}
            </p>
            <button
              onClick={refetch}
              style={{
                background: "#1a7a50",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "0.6rem 1.5rem",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Sin movimientos */}
        {!loading && !error && Object.keys(groupedMovements).length === 0 && (
          <div
            style={{ textAlign: "center", padding: "4rem 0", color: "#9ca3af" }}
          >
            <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📭</p>
            <p style={{ fontWeight: 600, color: "#6b7280" }}>Sin movimientos</p>
            <p style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
              {searchTerm
                ? "No hay resultados para tu búsqueda."
                : "Registra tu primer gasto usando el botón +."}
            </p>
          </div>
        )}

        {/* Lista agrupada */}
        {!loading &&
          !error &&
          Object.entries(groupedMovements).map(([date, movements]) => (
            <div key={date} className="mv-date-group">
              <div className="mv-date-header">{formatDate(date)}</div>
              {movements.map((movimiento) => (
                <MovementCard
                  key={movimiento.id}
                  movimiento={movimiento}
                  onEdit={setSelectedMovement}
                />
              ))}
            </div>
          ))}
      </main>

      {/* Modal de edición */}
      {selectedMovement && (
        <MovementOptionsModal
          movement={selectedMovement}
          onClose={() => setSelectedMovement(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
      <BottomNav />
    </div>
  );
};
