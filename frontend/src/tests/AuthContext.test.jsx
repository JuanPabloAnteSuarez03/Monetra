// src/test/AuthContext.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react'; // 👈 Importamos act
import { MemoryRouter } from 'react-router-dom';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { getDoc } from 'firebase/firestore';
import { AuthProvider, AuthContext } from '../context/AuthContext';
import useAuth from '../hooks/useAuth';

// ── Componente auxiliar que expone el contexto en el DOM ──────────────────
const AuthConsumer = () => {
  const { user, loading, error } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : 'null'}</span>
      <span data-testid="error">{error ?? 'null'}</span>
    </div>
  );
};

const renderProvider = (ui) =>
  render(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );

// ─────────────────────────────────────────────────────────────────────────
describe('AuthContext — estado inicial', () => {
  it('suscribe a onAuthStateChanged exactamente una vez al montarse', () => {
    onAuthStateChanged.mockImplementation(() => () => {});
    renderProvider(<AuthConsumer />);
    expect(onAuthStateChanged).toHaveBeenCalledTimes(1);
  });

  it('establece user=null cuando Firebase indica sin sesión', async () => {
    onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback(null);
      return () => {};
    });

    renderProvider(<AuthConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('null');
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });

  it('establece el user cuando Firebase devuelve una sesión activa', async () => {
    const fakeUser = { uid: 'uid-1', email: 'test@correo.com', displayName: 'Test' };
    onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback(fakeUser);
      return () => {};
    });
    getDoc.mockResolvedValueOnce({ exists: () => false });

    renderProvider(<AuthConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('test@correo.com');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('AuthContext — loginConCorreo', () => {
  beforeEach(() => {
    onAuthStateChanged.mockImplementation((_auth, cb) => { cb(null); return () => {}; });
  });

  it('llama a signInWithEmailAndPassword con las credenciales correctas', async () => {
    const fakeUser = { uid: 'uid-2', email: 'a@b.com' };
    signInWithEmailAndPassword.mockResolvedValueOnce({ user: fakeUser });

    const Trigger = () => {
      const { loginConCorreo } = useAuth();
      return (
        <button onClick={() => loginConCorreo('a@b.com', 'pass123')}>
          login
        </button>
      );
    };

    const { getByRole } = renderProvider(<Trigger />);
    
    // ✅ CORRECCIÓN: Envolvemos el click asíncrono en un bloque act(...)
    await act(async () => {
      getByRole('button', { name: 'login' }).click();
    });

    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(), 'a@b.com', 'pass123'
      );
    });
  });

  it('propaga el error de Firebase si las credenciales son incorrectas', async () => {
    signInWithEmailAndPassword.mockRejectedValueOnce(
      new Error('auth/wrong-password')
    );

    let caughtError = null;
    const Trigger = () => {
      const { loginConCorreo } = useAuth();
      const handle = async () => {
        try { await loginConCorreo('a@b.com', 'wrongpass'); }
        catch (e) { caughtError = e.message; }
      };
      return <button onClick={handle}>login</button>;
    };

    const { getByRole } = renderProvider(<Trigger />);
    
    // ✅ CORRECCIÓN: Envolvemos en act(...) para procesar el estado que genera el catch
    await act(async () => {
      getByRole('button', { name: 'login' }).click();
    });

    await waitFor(() => {
      expect(caughtError).toBe('auth/wrong-password');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('AuthContext — registroConCorreo', () => {
  beforeEach(() => {
    onAuthStateChanged.mockImplementation((_auth, cb) => { cb(null); return () => {}; });
  });

  it('llama a createUserWithEmailAndPassword y luego a updateProfile', async () => {
    const newUser = { uid: 'uid-new', email: 'new@co.com', displayName: null };
    createUserWithEmailAndPassword.mockResolvedValueOnce({ user: newUser });
    updateProfile.mockResolvedValueOnce(undefined);
    getDoc.mockResolvedValueOnce({ exists: () => false });

    const Trigger = () => {
      const { registroConCorreo } = useAuth();
      return (
        <button onClick={() => registroConCorreo('new@co.com', 'pass123', 'Nuevo Usuario')}>
          registro
        </button>
      );
    };

    const { getByRole } = renderProvider(<Trigger />);
    
    // ✅ CORRECCIÓN: Envolvemos el click en act(...)
    await act(async () => {
      getByRole('button', { name: 'registro' }).click();
    });

    await waitFor(() => {
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(), 'new@co.com', 'pass123'
      );
      expect(updateProfile).toHaveBeenCalledWith(newUser, { displayName: 'Nuevo Usuario' });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('AuthContext — recuperarContrasena', () => {
  beforeEach(() => {
    onAuthStateChanged.mockImplementation((_auth, cb) => { cb(null); return () => {}; });
  });

  it('llama a sendPasswordResetEmail con el correo correcto', async () => {
    sendPasswordResetEmail.mockResolvedValueOnce(undefined);

    const Trigger = () => {
      const { recuperarContrasena } = useAuth();
      return (
        <button onClick={() => recuperarContrasena('reset@co.com')}>
          reset
        </button>
      );
    };

    const { getByRole } = renderProvider(<Trigger />);
    
    // ✅ CORRECCIÓN: Envolvemos el click en act(...)
    await act(async () => {
      getByRole('button', { name: 'reset' }).click();
    });

    await waitFor(() => {
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(
        expect.anything(), 'reset@co.com'
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('AuthContext — cerrarSesion', () => {
  beforeEach(() => {
    onAuthStateChanged.mockImplementation((_auth, cb) => { cb(null); return () => {}; });
  });

  it('llama a signOut de Firebase', async () => {
    signOut.mockResolvedValueOnce(undefined);

    const Trigger = () => {
      const { cerrarSesion } = useAuth();
      return <button onClick={cerrarSesion}>salir</button>;
    };

    const { getByRole } = renderProvider(<Trigger />);
    
    // ✅ CORRECCIÓN: Envolvemos el click en act(...)
    await act(async () => {
      getByRole('button', { name: 'salir' }).click();
    });

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledTimes(1);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('useAuth — uso fuera del provider', () => {
  it('lanza un error descriptivo si se usa fuera de AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const BadComponent = () => { useAuth(); return null; };
    expect(() => render(<BadComponent />)).toThrow(
      'useAuth debe ser utilizado estrictamente dentro de un AuthProvider'
    );
    spy.mockRestore();
  });
});