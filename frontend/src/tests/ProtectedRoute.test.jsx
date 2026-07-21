// src/test/ProtectedRoute.test.jsx
// Pruebas del guardián de rutas privadas:
// - Muestra spinner mientras carga
// - Redirige a /login si no hay sesión
// - Renderiza los children si hay sesión activa

import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ui/ProtectedRoute';
import { renderWithProviders } from './helpers';

// Página privada de ejemplo usada en los tests
const PaginaPrivada = () => <div>Contenido privado</div>;
// Página pública de login
const PaginaLogin   = () => <div>Página de Login</div>;

// Helper que monta ProtectedRoute dentro de un sistema de rutas real
// para que Navigate pueda redirigir correctamente
const renderRuta = (authValue, initialRoute = '/privada') =>
  renderWithProviders(
    <Routes>
      <Route
        path="/privada"
        element={
          <ProtectedRoute>
            <PaginaPrivada />
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<PaginaLogin />} />
    </Routes>,
    authValue,
    initialRoute
  );

// ─────────────────────────────────────────────────────────────────────────
describe('ProtectedRoute — estado de carga', () => {
  it('muestra el spinner "Cargando..." mientras loading es true', () => {
    renderRuta({ user: null, loading: true });

    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
    expect(screen.queryByText('Contenido privado')).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('ProtectedRoute — usuario NO autenticado', () => {
  it('redirige a /login cuando no hay sesión activa', () => {
    renderRuta({ user: null, loading: false });

    // Debe mostrar la página de login, no la privada
    expect(screen.getByText('Página de Login')).toBeInTheDocument();
    expect(screen.queryByText('Contenido privado')).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('ProtectedRoute — usuario autenticado', () => {
  it('renderiza los children cuando hay una sesión activa', () => {
    renderRuta({ user: { uid: '123', email: 'ok@test.com' }, loading: false });

    expect(screen.getByText('Contenido privado')).toBeInTheDocument();
    expect(screen.queryByText('Página de Login')).not.toBeInTheDocument();
  });
});