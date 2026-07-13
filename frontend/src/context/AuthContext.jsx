// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import React from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase/config';


export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // ── Escucha cambios de sesión en Firebase ──────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Enriquecemos el user con datos de Firestore si existen
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        setUser({ ...firebaseUser, ...(snap.exists() ? snap.data() : {}) });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // ── Helper: crear/actualizar documento en Firestore al registrar ───────
  const persistUserInFirestore = async (firebaseUser, extraData = {}) => {
    const ref  = doc(db, 'users', firebaseUser.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid:         firebaseUser.uid,
        email:       firebaseUser.email,
        displayName: firebaseUser.displayName ?? extraData.displayName ?? '',
        photoURL:    firebaseUser.photoURL    ?? '',
        createdAt:   serverTimestamp(),
        ...extraData,
      });
    }
  };

  // ── Autenticación con correo y contraseña ─────────────────────────────
  const loginConCorreo = async (email, password) => {
    setError(null);
    const { user: u } = await signInWithEmailAndPassword(auth, email, password);
    return u;
  };

  const registroConCorreo = async (email, password, displayName) => {
    setError(null);
    const { user: u } = await createUserWithEmailAndPassword(auth, email, password);
    // Actualiza el displayName en Firebase Auth
    await updateProfile(u, { displayName });
    await persistUserInFirestore(u, { displayName });
    return u;
  };

  // ── Autenticación con Google ──────────────────────────────────────────
  const loginConGoogle = async () => {
    setError(null);
    const { user: u } = await signInWithPopup(auth, googleProvider);
    await persistUserInFirestore(u);
    return u;
  };

  // ── Recuperación de contraseña ────────────────────────────────────────
  const recuperarContrasena = async (email) => {
    setError(null);
    await sendPasswordResetEmail(auth, email);
  };

  // ── Cerrar sesión ─────────────────────────────────────────────────────
  const cerrarSesion = async () => {
    setError(null);
    await signOut(auth);
  };

  const value = {
    user,
    loading,
    error,
    setError,
    loginConCorreo,
    registroConCorreo,
    loginConGoogle,
    recuperarContrasena,
    cerrarSesion,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}