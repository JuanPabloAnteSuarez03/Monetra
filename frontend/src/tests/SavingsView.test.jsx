// src/test/SavingsView.test.jsx
// Pruebas de la pantalla de ahorros:
// - Estado de carga y renderizado de metas con montos/porcentaje
// - Estado vacío cuando no hay metas
// - Flujo de creación de una nueva meta
// - Flujo de abono y validación de retiro que excede el saldo
// - Flujo de edición y eliminación de una meta

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./helpers";
import { SavingsView } from "../views/ahorros/SavingsView";
import { useSavings } from "../hooks/useSavings";

vi.mock("../hooks/useSavings", () => ({
  useSavings: vi.fn(),
}));

const mockGoal = {
  id: "goal-1",
  nombre: "Viaje a San Andrés",
  montoActual: 200000,
  monto_objetivo: 1000000,
  porcentajeAvance: 20,
  fechaEstimada: "2026-12-31",
};

const baseSavingsReturn = {
  progresos: [],
  resumen: null,
  loading: false,
  addGoal: vi.fn(),
  saveAbono: vi.fn(),
  saveRetiro: vi.fn(),
  deleteGoal: vi.fn(),
  updateGoal: vi.fn(),
};

const renderSavingsView = () => renderWithProviders(<SavingsView />);

describe("SavingsView — estado de carga y renderizado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra "Sincronizando con Monetra..." mientras loading es true', () => {
    useSavings.mockReturnValue({ ...baseSavingsReturn, loading: true });
    renderSavingsView();
    expect(screen.getByText(/sincronizando con monetra/i)).toBeInTheDocument();
  });

  it("muestra la meta con su nombre, montos formateados y porcentaje de avance", () => {
    useSavings.mockReturnValue({ ...baseSavingsReturn, progresos: [mockGoal] });
    renderSavingsView();

    expect(screen.getByText(/meta: viaje a san andrés/i)).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();
    expect(screen.getByText(/\$200\.000.*\$1\.000\.000/)).toBeInTheDocument();
  });

  it("muestra el estado vacío cuando no hay metas activas", () => {
    useSavings.mockReturnValue({ ...baseSavingsReturn, progresos: [] });
    renderSavingsView();
    expect(
      screen.getByText(/no tienes metas activas/i)
    ).toBeInTheDocument();
  });
});

describe("SavingsView — crear una meta nueva", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('abre el modal "Nuevo Objetivo Financiero" al hacer clic en la tarjeta punteada', () => {
    useSavings.mockReturnValue({ ...baseSavingsReturn });
    renderSavingsView();

    fireEvent.click(
      screen.getByText(/crear un nuevo objetivo financiero/i)
    );

    expect(screen.getByText("Nuevo Objetivo Financiero")).toBeInTheDocument();
  });

  it("llama a addGoal con los datos del formulario y cierra el modal si tiene éxito", async () => {
    const addGoal = vi.fn().mockResolvedValueOnce({ exito: true });
    useSavings.mockReturnValue({ ...baseSavingsReturn, addGoal });

    const { container } = renderSavingsView();
    fireEvent.click(screen.getByText(/crear un nuevo objetivo financiero/i));

    fireEvent.change(screen.getByPlaceholderText(/computador, viaje, moto/i), {
      target: { value: "Nuevo Portátil" },
    });
    fireEvent.change(screen.getByPlaceholderText(/1800000/i), {
      target: { value: "3000000" },
    });
    fireEvent.change(container.querySelector('input[type="date"]'), {
      target: { value: "2026-12-01" },
    });

    fireEvent.click(screen.getByRole("button", { name: /crear meta/i }));

    await waitFor(() => {
      expect(addGoal).toHaveBeenCalledWith({
        nombre: "Nuevo Portátil",
        monto: "3000000",
        fechaEstimada: "2026-12-01",
      });
      expect(screen.queryByText("Nuevo Objetivo Financiero")).not.toBeInTheDocument();
    });
  });
});

describe("SavingsView — abonar y retirar", () => {
  let alertSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it("registra un abono válido llamando a saveAbono con el id de la meta y el monto", async () => {
    const saveAbono = vi.fn().mockResolvedValueOnce({ exito: true });
    useSavings.mockReturnValue({
      ...baseSavingsReturn,
      progresos: [mockGoal],
      saveAbono,
    });

    renderSavingsView();
    fireEvent.click(screen.getByRole("button", { name: /abonar/i }));

    expect(screen.getByText(/registrar abono a/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/ej\. 50000/i), {
      target: { value: "50000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirmar abono/i }));

    await waitFor(() => {
      expect(saveAbono).toHaveBeenCalledWith("goal-1", 50000);
    });
  });

  it("bloquea un retiro que excede el monto ahorrado y no llama a saveRetiro", async () => {
    const saveRetiro = vi.fn();
    useSavings.mockReturnValue({
      ...baseSavingsReturn,
      progresos: [mockGoal],
      saveRetiro,
    });

    renderSavingsView();
    fireEvent.click(screen.getByRole("button", { name: /retirar/i }));

    fireEvent.change(screen.getByPlaceholderText(/ej\. 50000/i), {
      target: { value: "999999" },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirmar retiro/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
      expect(saveRetiro).not.toHaveBeenCalled();
    });
  });
});

describe("SavingsView — editar y eliminar una meta", () => {
  let confirmSpy;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    confirmSpy?.mockRestore();
  });

  it("abre el modal de edición con los datos de la meta precargados al hacer clic en la tarjeta", () => {
    useSavings.mockReturnValue({ ...baseSavingsReturn, progresos: [mockGoal] });
    renderSavingsView();

    fireEvent.click(screen.getByText(/meta: viaje a san andrés/i));

    expect(screen.getByText("Editar Meta")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Viaje a San Andrés")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1000000")).toBeInTheDocument();
  });

  it("llama a deleteGoal cuando se confirma la eliminación", async () => {
    confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const deleteGoal = vi.fn().mockResolvedValueOnce({ exito: true });
    useSavings.mockReturnValue({
      ...baseSavingsReturn,
      progresos: [mockGoal],
      deleteGoal,
    });

    renderSavingsView();
    fireEvent.click(screen.getByText(/meta: viaje a san andrés/i));
    fireEvent.click(screen.getByRole("button", { name: /eliminar meta/i }));

    await waitFor(() => {
      expect(deleteGoal).toHaveBeenCalledWith("goal-1");
      expect(screen.queryByText("Editar Meta")).not.toBeInTheDocument();
    });
  });

  it("no llama a deleteGoal si el usuario cancela la confirmación", () => {
    confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const deleteGoal = vi.fn();
    useSavings.mockReturnValue({
      ...baseSavingsReturn,
      progresos: [mockGoal],
      deleteGoal,
    });

    renderSavingsView();
    fireEvent.click(screen.getByText(/meta: viaje a san andrés/i));
    fireEvent.click(screen.getByRole("button", { name: /eliminar meta/i }));

    expect(deleteGoal).not.toHaveBeenCalled();
  });
});
