// src/test/helpers.jsx
// Utilidades reutilizables para todos los tests.
// Centralizar aquí evita repetir el boilerplate de providers en cada archivo.

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

// ── Usuario de prueba genérico ────────────────────────────────────────────
export const mockUser = {
  uid:         'test-uid-123',
  email:       'juan@test.com',
  displayName: 'Juan García',
  photoURL:    null,
};

// ── Valor por defecto del contexto (sesión activa) ────────────────────────
export const defaultAuthValue = {
  user:               mockUser,
  loading:            false,
  error:              null,
  setError:           vi.fn(),
  loginConCorreo:     vi.fn(),
  registroConCorreo:  vi.fn(),
  loginConGoogle:     vi.fn(),
  recuperarContrasena: vi.fn(),
  cerrarSesion:       vi.fn(),
};

/**
 * renderWithProviders
 * Renderiza cualquier componente envuelto en MemoryRouter + AuthContext.
 *
 * @param {ReactElement} ui          - Componente a renderizar
 * @param {object}       authValue   - Valor del contexto (parcial, se mezcla con defaultAuthValue)
 * @param {string}       initialRoute - Ruta inicial para el router (por defecto '/')
 */
export function renderWithProviders(ui, authValue = {}, initialRoute = '/') {
  const contextValue = { ...defaultAuthValue, ...authValue };

  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthContext.Provider value={contextValue}>
        {ui}
      </AuthContext.Provider>
    </MemoryRouter>
  );
}
