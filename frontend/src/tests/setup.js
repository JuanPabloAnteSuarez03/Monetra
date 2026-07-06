// src/test/setup.js
// Ejecutado ANTES de cada suite. Centraliza mocks globales.

import '@testing-library/jest-dom';

// ── FIX: "React is not defined" ───────────────────────────────────────────
// Los componentes del proyecto no importan React explícitamente porque
// @vitejs/plugin-react lo inyecta automáticamente en el servidor de desarrollo.
// En el entorno de Vitest (jsdom) ese plugin no actúa, así que lo exponemos
// manualmente en el global para que todos los archivos JSX lo encuentren.
import React from 'react';
globalThis.React = React;

// ── Mock completo de Firebase Auth ────────────────────────────────────────
vi.mock('firebase/auth', () => ({
  getAuth:                        vi.fn(() => ({})),
  GoogleAuthProvider:             vi.fn(() => ({})),
  onAuthStateChanged:             vi.fn(),
  signInWithEmailAndPassword:     vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithPopup:                vi.fn(),
  sendPasswordResetEmail:         vi.fn(),
  signOut:                        vi.fn(),
  updateProfile:                  vi.fn(),
}));

// ── Mock completo de Firebase Firestore ───────────────────────────────────
vi.mock('firebase/firestore', () => ({
  getFirestore:    vi.fn(() => ({})),
  doc:             vi.fn(),
  setDoc:          vi.fn(),
  getDoc:          vi.fn(() => Promise.resolve({ exists: () => false })),
  serverTimestamp: vi.fn(() => new Date()),
}));

// ── Mock de la inicialización de Firebase ─────────────────────────────────
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

// ── Mock del módulo de configuración propio ───────────────────────────────
vi.mock('../firebase/config', () => ({
  auth:           {},
  db:             {},
  googleProvider: {},
}));