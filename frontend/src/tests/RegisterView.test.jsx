// src/test/RegisterView.test.jsx
// Pruebas de la pantalla de registro:
// - Renderiza todos los campos del formulario
// - El toggle de mostrar/ocultar contraseña funciona
// - El flujo feliz llama a registroConCorreo y navega al dashboard
// - Los errores de Firebase se muestran al usuario
// - El enlace "Inicia sesión aquí" navega a /login

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { RegisterView } from '../views/auth/RegisterView';
import { renderWithProviders } from './helpers';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, useNavigate: () => mockNavigate };
});

const renderRegister = (authOverrides = {}) =>
  renderWithProviders(<RegisterView />, { user: null, ...authOverrides });

// ─────────────────────────────────────────────────────────────────────────
describe('RegisterView — renderizado', () => {
  it('muestra el título principal', () => {
    renderRegister();
    expect(screen.getByText(/únete a monetra/i)).toBeInTheDocument();
  });

  it('muestra los tres campos del formulario', () => {
    renderRegister();
    expect(screen.getByPlaceholderText(/Ej\. Juan Pérez/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/tu@correo\.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/mínimo 6 caracteres/i)).toBeInTheDocument();
  });

  it('muestra el botón de submit', () => {
    renderRegister();
    expect(
      screen.getByRole('button', { name: /crear cuenta/i })
    ).toBeInTheDocument();
  });

  it('muestra el enlace para ir al login', () => {
    renderRegister();
    expect(
      screen.getByRole('button', { name: /inicia sesión aquí/i })
    ).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('RegisterView — toggle de contraseña', () => {
  it('el input de contraseña empieza con type="password"', () => {
    renderRegister();
    const input = screen.getByPlaceholderText(/mínimo 6 caracteres/i);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('cambia a type="text" al hacer clic en "Ver"', () => {
    renderRegister();
    const toggleBtn = screen.getByRole('button', { name: /ver/i });
    fireEvent.click(toggleBtn);

    const input = screen.getByPlaceholderText(/mínimo 6 caracteres/i);
    expect(input).toHaveAttribute('type', 'text');
    // El botón ahora debe decir "Ocultar"
    expect(screen.getByRole('button', { name: /ocultar/i })).toBeInTheDocument();
  });

  it('vuelve a type="password" al hacer clic en "Ocultar"', () => {
    renderRegister();
    const toggleBtn = screen.getByRole('button', { name: /ver/i });
    fireEvent.click(toggleBtn); // → text
    fireEvent.click(screen.getByRole('button', { name: /ocultar/i })); // → password

    const input = screen.getByPlaceholderText(/mínimo 6 caracteres/i);
    expect(input).toHaveAttribute('type', 'password');
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('RegisterView — flujo de registro (éxito)', () => {
  it('llama a registroConCorreo con los datos del formulario y navega al dashboard', async () => {
    const registroConCorreo = vi.fn().mockResolvedValueOnce({
      uid: 'uid-new', email: 'nuevo@co.com',
    });

    renderRegister({ registroConCorreo });

    // Rellenar formulario
    fireEvent.change(screen.getByPlaceholderText(/Ej\. Juan Pérez/i), {
      target: { value: 'Nuevo Usuario' },
    });
    fireEvent.change(screen.getByPlaceholderText(/tu@correo\.com/i), {
      target: { value: 'nuevo@co.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/mínimo 6 caracteres/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(registroConCorreo).toHaveBeenCalledWith(
        'nuevo@co.com',
        'password123',
        'Nuevo Usuario'
      );
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('muestra "Creando cuenta..." en el botón mientras procesa', async () => {
    // Promesa que nunca resuelve → simula loading infinito
    const registroConCorreo = vi.fn(() => new Promise(() => {}));

    renderRegister({ registroConCorreo });

    fireEvent.change(screen.getByPlaceholderText(/Ej\. Juan Pérez/i), {
      target: { value: 'Test' },
    });
    fireEvent.change(screen.getByPlaceholderText(/tu@correo\.com/i), {
      target: { value: 't@t.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/mínimo 6 caracteres/i), {
      target: { value: '123456' },
    });

    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(screen.getByText(/creando cuenta/i)).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('RegisterView — flujo de registro (error)', () => {
  it('muestra el mensaje de error si registroConCorreo falla', async () => {
    const registroConCorreo = vi.fn().mockRejectedValueOnce(
      new Error('auth/email-already-in-use')
    );

    renderRegister({ registroConCorreo });

    fireEvent.change(screen.getByPlaceholderText(/Ej\. Juan Pérez/i), {
      target: { value: 'Test' },
    });
    fireEvent.change(screen.getByPlaceholderText(/tu@correo\.com/i), {
      target: { value: 'existe@co.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/mínimo 6 caracteres/i), {
      target: { value: '123456' },
    });

    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(screen.getByText(/error al crear la cuenta/i)).toBeInTheDocument();
    });
  });

  it('deshabilita el botón mientras loading es true', async () => {
    const registroConCorreo = vi.fn(() => new Promise(() => {}));
    renderRegister({ registroConCorreo });

    fireEvent.change(screen.getByPlaceholderText(/Ej\. Juan Pérez/i), {
      target: { value: 'Test' },
    });
    fireEvent.change(screen.getByPlaceholderText(/tu@correo\.com/i), {
      target: { value: 't@t.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/mínimo 6 caracteres/i), {
      target: { value: '123456' },
    });

    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /creando cuenta/i })
      ).toBeDisabled();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('RegisterView — navegación', () => {
  it('navega a /login al hacer clic en "Inicia sesión aquí"', () => {
    mockNavigate.mockClear();
    renderRegister();

    fireEvent.click(
      screen.getByRole('button', { name: /inicia sesión aquí/i })
    );

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
