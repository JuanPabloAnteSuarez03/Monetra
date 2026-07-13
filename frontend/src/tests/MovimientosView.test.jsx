import { describe, test, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./helpers";
import { MovimientosView } from "../views/movimientos/MovimientosView";
import { useMovements } from "../hooks/useMovements";
import { updateMovement, deleteMovement } from "../services/movementApi";

// 1. Mocks de los Hooks y Servicios
vi.mock("../hooks/useMovements", () => ({
  useMovements: vi.fn(),
}));

vi.mock("../services/movementApi", () => ({
  updateMovement: vi.fn(),
  deleteMovement: vi.fn(),
}));

// Mock manual de react-router-dom para el botón de navegación (+)
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Pruebas en <MovimientosView />", () => {
  const mockMovementsData = [
    {
      id: "mov-1",
      descripcion: "Almuerzo Ejecutivo",
      categoria: "Alimentación",
      monto: 15000,
      fecha: "2026-06-15",
      hora: "13:00",
    },
    {
      id: "mov-2",
      descripcion: "Pasaje bus",
      categoria: "Transporte",
      monto: 3000,
      fecha: "2026-06-15",
      hora: "08:00",
    },
  ];

  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("debe mostrar el estado de carga (loading)", () => {
    useMovements.mockReturnValue({
      movimientos: [],
      loading: true,
      error: null,
      refetch: mockRefetch,
    });

    renderWithProviders(<MovimientosView />);
    expect(screen.getByText(/Cargando movimientos/i)).toBeInTheDocument();
  });

  test("debe renderizar los movimientos agrupados por fecha correctamente", () => {
    useMovements.mockReturnValue({
      movimientos: mockMovementsData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    renderWithProviders(<MovimientosView />);

    // Verifica que la fecha formateada o cruda aparezca (el componente tiene un helper formatDate)
    expect(screen.getByText("Almuerzo Ejecutivo")).toBeInTheDocument();
    expect(screen.getByText("Pasaje bus")).toBeInTheDocument();
    // Verifica montos con formato local de pesos
    expect(screen.getByText(/-.*15\.000/)).toBeInTheDocument();
  });

  test("debe abrir el modal de edición al hacer clic en el botón de la tarjeta", async () => {
    useMovements.mockReturnValue({
      movimientos: mockMovementsData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    renderWithProviders(<MovimientosView />);

    // Buscamos el botón de editar (emoji ✏️ o clase correspondiente)
    const editButtons = screen.getAllByText("✏️");
    fireEvent.click(editButtons[0]);

    // El modal de opciones debería estar abierto
    expect(screen.getByText("Editar movimiento")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Almuerzo Ejecutivo")).toBeInTheDocument();
  });

  /*   test('debe llamar a updateMovement y refrescar al guardar cambios en el modal', async () => {
    useMovements.mockReturnValue({
      movimientos: mockMovementsData,
      loading: false,
      error: null,
      refetch: mockRefetch
    });
    updateMovement.mockResolvedValue({ exito: true });

    renderWithProviders(<MovimientosView />);

    // Abrir modal
    fireEvent.click(screen.getAllByText('✏️')[0]);

    // Modificar descripción
    const inputDesc = screen.getByLabelText ? screen.getByLabelText(/Descripción/i) : screen.getByDisplayValue('Almuerzo Ejecutivo');
    fireEvent.change(inputDesc, { target: { value: 'Almuerzo Familiar' } });

    // Guardar
    const saveBtn = screen.getByText(/Guardar cambios/i);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateMovement).toHaveBeenCalledWith('mov-1', expect.objectContaining({
        descripcion: 'Almuerzo Familiar'
      }));
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  test('debe llamar a deleteMovement tras confirmar la eliminación en el modal', async () => {
    useMovements.mockReturnValue({
      movimientos: mockMovementsData,
      loading: false,
      error: null,
      refetch: mockRefetch
    });
    deleteMovement.mockResolvedValue({ exito: true });

    renderWithProviders(<MovimientosView />);

    // Abrir modal
    fireEvent.click(screen.getAllByText('✏️')[0]);

    // Click en eliminar para abrir confirmación
    fireEvent.click(screen.getByText('Eliminar'));

    // Confirmar eliminación
    fireEvent.click(screen.getByText('Sí, eliminar'));

    await waitFor(() => {
      expect(deleteMovement).toHaveBeenCalledWith('mov-1');
      expect(mockRefetch).toHaveBeenCalled();
    });
  }); */

  test("debe navegar a la vista de registro al hacer clic en el botón flotante (+) del BottomNav", () => {
    useMovements.mockReturnValue({
      movimientos: [],
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    renderWithProviders(<MovimientosView />);

    // El FAB de "+" vive en el BottomNav compartido (no en MovimientosView)
    // y navega directamente con su propio useNavigate.
    const fabButton = screen.getByLabelText("Registrar gasto");
    fireEvent.click(fabButton);

    expect(mockNavigate).toHaveBeenCalledWith("/registro");
  });
});
