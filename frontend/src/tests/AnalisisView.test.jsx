import { describe, test, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "./helpers";
import { AnalisisView } from "../views/analisis/AnalisisView";
import { useFinancialHistory } from "../hooks/useFinancialHistory";
import { useSavings } from "../hooks/useSavings";
import {
  getFinancialAnalysis,
  saveFinancialRecommendations,
  getLatestRecommendation,
} from "../services/financialAiApi";

// ─── Mocks de Chart.js ──────────────────────────────────────────────────────
vi.mock("chart.js", () => {
  const MockChart = vi.fn(function MockChart() {
    return {
      destroy: vi.fn(),
      update: vi.fn(),
    };
  });
  MockChart.register = vi.fn();
  return {
    Chart: MockChart,
    registerables: [],
  };
});

// ─── Mocks de layout (no son objeto de esta prueba) ────────────────────────
vi.mock("../components/layout/AppHeader", () => ({
  AppHeader: () => <div data-testid="app-header" />,
}));

vi.mock("../components/layout/BottomNav", () => ({
  BottomNav: () => <div data-testid="bottom-nav" />,
}));

// ─── Mock del hook de datos financieros ────────────────────────────────────
vi.mock("../hooks/useFinancialHistory", () => ({
  useFinancialHistory: vi.fn(),
}));

// ─── Mock del hook de metas de ahorro ──────────────────────────────────────
vi.mock("../hooks/useSavings", () => ({
  useSavings: vi.fn(),
}));

// ─── Mock de los servicios de IA ───────────────────────────────────────────
vi.mock("../services/financialAiApi", () => ({
  getFinancialAnalysis: vi.fn(),
  saveFinancialRecommendations: vi.fn(),
  getLatestRecommendation: vi.fn(),
}));

// ─── Fixtures ───────────────────────────────────────────────────────────────
const HISTORIAL_MOCK = {
  movimientos: [
    {
      tipo: "gasto",
      monto: 50000,
      fecha: "2025-06-03",
      categoria: "Alimentación",
    },
    {
      tipo: "gasto",
      monto: 30000,
      fecha: "2025-06-12",
      categoria: "Transporte",
    },
  ],
  periodo: "2025-06",
  historialMensual: [
    { mes: "2025-05", gastos: 3800000 },
    { mes: "2025-06", gastos: 4100000 },
  ],
  resumenGeneral: {
    totalGastos: 4100000,
    totalIngresos: 5000000,
    totalAhorros: 900000,
    totalMovimientos: 24,
    flujoNeto: 900000,
  },
  promediosMensuales: { gastoPromedioMensual: 3950000 },
  categoriasFrecuentes: [
    { nombre: "Alimentación", total: 280000 },
    { nombre: "Transporte", total: 210000 },
    { nombre: "Ocio", total: 90000 },
  ],
  tendenciaGastos: {
    tendencia: "aumento",
    variacionPorcentual: 7.9,
    descripcion: "Tus gastos subieron respecto al mes anterior",
  },
};

const buildHookReturn = (overrides = {}) => ({
  historial: HISTORIAL_MOCK,
  loading: false,
  error: null,
  ...overrides,
});

// Fixture de useSavings — una meta activa de ejemplo
const METAS_AHORRO_MOCK = [
  {
    id: "meta-1",
    nombre: "Nuevo MacBook",
    estado: "activa",
    montoObjetivo: 2500000,
    montoActual: 1800000,
    porcentajeAvance: 72,
  },
];

const buildSavingsHookReturn = (overrides = {}) => ({
  progresos: METAS_AHORRO_MOCK,
  resumen: { promedioAvanceGeneral: 72 },
  loading: false,
  error: null,
  addGoal: vi.fn(),
  saveAbono: vi.fn(),
  refresh: vi.fn(),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  useFinancialHistory.mockReturnValue(buildHookReturn());
  useSavings.mockReturnValue(buildSavingsHookReturn());
});

describe("Pruebas en <AnalisisView />", () => {
  test("debe renderizar las secciones clave de la vista", () => {
    renderWithProviders(<AnalisisView />);

    expect(screen.getByText("Análisis Financiero")).toBeInTheDocument();
    expect(screen.getByText("Distribución de Gastos")).toBeInTheDocument();
    expect(screen.getByText("Tendencias de Gastos")).toBeInTheDocument();
    expect(screen.getByText("Meta de Ahorro")).toBeInTheDocument();
  });

  test("debe renderizar el toggle con las opciones Semanal y Mensual", () => {
    renderWithProviders(<AnalisisView />);

    expect(screen.getByText("Semanal")).toBeInTheDocument();
    expect(screen.getByText("Mensual")).toBeInTheDocument();
  });

  test("debe cambiar la pestaña de rango temporal al hacer clic", async () => {
    renderWithProviders(<AnalisisView />);

    const semanalTab = screen.getByText("Semanal");
    const mensualTab = screen.getByText("Mensual");

    // "Mensual" empieza activo por defecto
    expect(mensualTab).toHaveClass("active");
    expect(semanalTab).not.toHaveClass("active");

    // Clic en "Semanal"
    fireEvent.click(semanalTab);

    expect(semanalTab).toHaveClass("active");
    expect(mensualTab).not.toHaveClass("active");
  });

  test("debe actualizar el subtítulo de la gráfica al cambiar a Semanal", () => {
    renderWithProviders(<AnalisisView />);

    expect(
      screen.getByText("Tus patrones de gasto en los últimos 6 meses"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("Semanal"));

    expect(
      screen.getByText("Gastos por semana del mes actual"),
    ).toBeInTheDocument();
  });

  describe("Estado de carga", () => {
    test("debe mostrar el banner de carga y placeholders cuando loading es true", () => {
      useFinancialHistory.mockReturnValue(
        buildHookReturn({ historial: null, loading: true }),
      );

      renderWithProviders(<AnalisisView />);

      expect(
        screen.getByText("Cargando datos financieros..."),
      ).toBeInTheDocument();
      expect(screen.getByText("Cargando categorías...")).toBeInTheDocument();
    });
  });

  describe("Estado de error", () => {
    test("debe mostrar el banner de error cuando el hook retorna un error", () => {
      useFinancialHistory.mockReturnValue(
        buildHookReturn({ error: "No se pudo cargar el historial" }),
      );

      renderWithProviders(<AnalisisView />);

      expect(
        screen.getByText("No se pudo cargar el historial"),
      ).toBeInTheDocument();
    });

    test("no debe mostrar el banner de error mientras está cargando", () => {
      useFinancialHistory.mockReturnValue(
        buildHookReturn({ loading: true, error: "Error tardío" }),
      );

      renderWithProviders(<AnalisisView />);

      expect(screen.queryByText("Error tardío")).not.toBeInTheDocument();
    });
  });

  describe("Métricas y categorías", () => {
    test("debe renderizar las métricas principales formateadas en pesos", () => {
      renderWithProviders(<AnalisisView />);

      expect(screen.getByText("$4.100.000")).toBeInTheDocument(); // Total Gastado
      expect(screen.getByText("$5.000.000")).toBeInTheDocument(); // Total Ingresos
      expect(screen.getByText("82%")).toBeInTheDocument(); // Gasto sobre Ingresos (4100000/5000000)
    });

    test("debe renderizar las categorías principales con su monto", () => {
      renderWithProviders(<AnalisisView />);

      const tituloCategorias = screen.getByText("Categorías Principales");
      const tarjetaCategorias = tituloCategorias.closest(".analisis-card");

      expect(
        within(tarjetaCategorias).getByText("Alimentación"),
      ).toBeInTheDocument();
      expect(
        within(tarjetaCategorias).getByText("$280.000"),
      ).toBeInTheDocument();
      expect(
        within(tarjetaCategorias).getByText("Transporte"),
      ).toBeInTheDocument();
      expect(within(tarjetaCategorias).getByText("Ocio")).toBeInTheDocument();
    });

    test("debe mostrar mensaje vacío si no hay categorías", () => {
      useFinancialHistory.mockReturnValue(
        buildHookReturn({
          historial: { ...HISTORIAL_MOCK, categoriasFrecuentes: [] },
        }),
      );

      renderWithProviders(<AnalisisView />);

      expect(
        screen.getByText("Sin movimientos en este período."),
      ).toBeInTheDocument();
    });
  });

  describe("Tendencia de gastos", () => {
    test("debe mostrar la flecha y porcentaje correctos cuando la tendencia es de aumento", () => {
      renderWithProviders(<AnalisisView />);

      expect(screen.getByText("↑")).toBeInTheDocument();
      expect(screen.getByText("7.9%")).toBeInTheDocument();
      expect(
        screen.getByText("Tus gastos subieron respecto al mes anterior"),
      ).toBeInTheDocument();
    });

    test("debe mostrar la flecha de disminución cuando la tendencia baja", () => {
      useFinancialHistory.mockReturnValue(
        buildHookReturn({
          historial: {
            ...HISTORIAL_MOCK,
            tendenciaGastos: {
              tendencia: "disminucion",
              variacionPorcentual: 4.2,
              descripcion: "Bajaron tus gastos",
            },
          },
        }),
      );

      renderWithProviders(<AnalisisView />);

      expect(screen.getByText("↓")).toBeInTheDocument();
    });
  });

  describe("Modal de IA — Generar análisis nuevo", () => {
    test("debe abrir el modal en modo nuevo al hacer clic en 'Generar análisis con IA'", () => {
      renderWithProviders(<AnalisisView />);

      fireEvent.click(screen.getByText("Generar análisis con IA"));

      expect(screen.getByText("Análisis con IA")).toBeInTheDocument();
      expect(
        screen.getByText("Listo para analizar tus finanzas"),
      ).toBeInTheDocument();
    });

    test("debe llamar a los servicios de IA y mostrar el resultado al generar", async () => {
      getFinancialAnalysis.mockResolvedValue({
        data: { resumenEjecutivo: "Resumen de prueba" },
      });
      saveFinancialRecommendations.mockResolvedValue({
        data: {
          recomendaciones: [
            { titulo: "Ahorra más", accionSugerida: "Reduce gastos" },
          ],
        },
      });

      renderWithProviders(<AnalisisView />);

      fireEvent.click(screen.getByText("Generar análisis con IA"));
      fireEvent.click(screen.getByText("Generar ahora"));

      expect(screen.getByText(/Analizando tus finanzas/)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText(/Resumen de prueba/)).toBeInTheDocument();
      });

      expect(getFinancialAnalysis).toHaveBeenCalledWith({
        movimientos: HISTORIAL_MOCK.movimientos,
        periodo: HISTORIAL_MOCK.periodo,
      });
      expect(saveFinancialRecommendations).toHaveBeenCalledWith({
        movimientos: HISTORIAL_MOCK.movimientos,
        periodo: HISTORIAL_MOCK.periodo,
      });
      expect(
        screen.getByText("Ahorra más: Reduce gastos", { exact: false }),
      ).toBeInTheDocument();
    });

    test("debe mostrar un mensaje de error si la generación del análisis falla", async () => {
      getFinancialAnalysis.mockRejectedValue(new Error("Falló el servidor"));
      saveFinancialRecommendations.mockResolvedValue({ data: {} });

      renderWithProviders(<AnalisisView />);

      fireEvent.click(screen.getByText("Generar análisis con IA"));
      fireEvent.click(screen.getByText("Generar ahora"));

      await waitFor(() => {
        expect(screen.getByText("Falló el servidor")).toBeInTheDocument();
      });
    });

    test("debe permitir regenerar el análisis desde el footer del modal", async () => {
      getFinancialAnalysis.mockResolvedValue({
        data: { resumenEjecutivo: "Primer resumen" },
      });
      saveFinancialRecommendations.mockResolvedValue({ data: {} });

      renderWithProviders(<AnalisisView />);

      fireEvent.click(screen.getByText("Generar análisis con IA"));
      fireEvent.click(screen.getByText("Generar ahora"));

      await waitFor(() => {
        expect(screen.getByText(/Primer resumen/)).toBeInTheDocument();
      });

      expect(screen.getByText("Regenerar análisis")).toBeInTheDocument();
      fireEvent.click(screen.getByText("Regenerar análisis"));

      expect(getFinancialAnalysis).toHaveBeenCalledTimes(2);
    });

    test("debe cerrar el modal al hacer clic en el botón de cerrar", () => {
      renderWithProviders(<AnalisisView />);

      fireEvent.click(screen.getByText("Generar análisis con IA"));
      expect(screen.getByText("Análisis con IA")).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText("Cerrar"));

      expect(screen.queryByText("Análisis con IA")).not.toBeInTheDocument();
    });

    test("debe cerrar el modal al presionar la tecla Escape", () => {
      renderWithProviders(<AnalisisView />);

      fireEvent.click(screen.getByText("Generar análisis con IA"));
      expect(screen.getByText("Análisis con IA")).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });

      expect(screen.queryByText("Análisis con IA")).not.toBeInTheDocument();
    });
  });

  describe("Modal de IA — Consultar análisis anterior", () => {
    test("debe abrir el modal en modo anterior y mostrar el análisis guardado", async () => {
      getLatestRecommendation.mockResolvedValue({
        creadoEn: "2025-05-15T00:00:00.000Z",
        data: {
          analisis: { resumenEjecutivo: "Resumen guardado anterior" },
          recomendaciones: [],
        },
      });

      renderWithProviders(<AnalisisView />);

      fireEvent.click(screen.getByText("Consultar análisis anterior"));

      expect(screen.getByText("Análisis Anterior")).toBeInTheDocument();
      expect(
        screen.getByText("Cargando análisis anterior..."),
      ).toBeInTheDocument();

      await waitFor(() => {
        expect(
          screen.getByText(/Resumen guardado anterior/),
        ).toBeInTheDocument();
      });

      expect(getLatestRecommendation).toHaveBeenCalledTimes(1);
    });

    test("debe indicar que no hay análisis guardados cuando el registro es nulo", async () => {
      getLatestRecommendation.mockResolvedValue(null);

      renderWithProviders(<AnalisisView />);

      fireEvent.click(screen.getByText("Consultar análisis anterior"));

      await waitFor(() => {
        expect(
          screen.getByText(
            "Aún no tienes análisis guardados. Genera uno primero.",
          ),
        ).toBeInTheDocument();
      });
    });
  });
});
