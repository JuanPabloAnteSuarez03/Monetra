// src/test/LoginView.test.jsx
// Pruebas de la pantalla de login:
// - Renderiza los elementos clave (logo, botón Google, footer)
// - El flujo feliz con Google navega al dashboard
// - Un error de Firebase muestra el mensaje al usuario

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginView } from '../views/auth/LoginView';
import { renderWithProviders } from './helpers';

// useNavigate es un hook de react-router-dom; lo mockeamos para
// verificar que navigate('/dashboard') se llama tras el login exitoso.
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, useNavigate: () => mockNavigate };
});

const renderLogin = (authOverrides = {}) =>
  renderWithProviders(<LoginView />, authOverrides);

// ─────────────────────────────────────────────────────────────────────────
describe('LoginView — renderizado', () => {
  it('muestra el título "Monetra"', () => {
    renderLogin({ user: null });
    expect(screen.getByText('Monetra')).toBeInTheDocument();
  });

  it('muestra el botón de Google', () => {
    renderLogin({ user: null });
    expect(
      screen.getByRole('button', { name: /continuar con google/i })
    ).toBeInTheDocument();
  });

  it('muestra el footer de copyright', () => {
    renderLogin({ user: null });
    expect(screen.getByText(/© 2026 Monetra/i)).toBeInTheDocument();
  });

  it('NO muestra ningún mensaje de error al cargar', () => {
    renderLogin({ user: null });
    // El elemento de error solo aparece cuando error !== ''
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('LoginView — flujo de Google (éxito)', () => {
  it('llama a loginConGoogle y navega a /dashboard al hacer clic', async () => {
    const loginConGoogle = vi.fn().mockResolvedValueOnce({
      uid: 'uid-g', email: 'g@google.com',
    });

    renderLogin({ user: null, loginConGoogle });

    fireEvent.click(
      screen.getByRole('button', { name: /continuar con google/i })
    );

    await waitFor(() => {
      expect(loginConGoogle).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('LoginView — flujo de Google (error)', () => {
  it('muestra el mensaje de error si loginConGoogle falla', async () => {
    const loginConGoogle = vi.fn().mockRejectedValueOnce(
      new Error('popup-closed')
    );

    renderLogin({ user: null, loginConGoogle });

    fireEvent.click(
      screen.getByRole('button', { name: /continuar con google/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/error al autenticar con google/i)
      ).toBeInTheDocument();
    });
  });

  it('NO navega si loginConGoogle falla', async () => {
    mockNavigate.mockClear();
    const loginConGoogle = vi.fn().mockRejectedValueOnce(new Error('error'));

    renderLogin({ user: null, loginConGoogle });

    fireEvent.click(
      screen.getByRole('button', { name: /continuar con google/i })
    );

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});