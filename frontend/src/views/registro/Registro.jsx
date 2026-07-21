// frontend/src/views/registro/Registro.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Registro.css';
import { BottomNav } from '../../components/layout/BottomNav';
import { scanInvoice } from '../../services/ocrApi';
import { createMovement } from '../../services/movementApi';

// Categorías para movimientos de tipo "gasto"
const CATEGORIAS_GASTO = [
  { id: 'Alimentación', label: 'Comida',     emoji: '🍔' },
  { id: 'Transporte',   label: 'Transporte', emoji: '🚌' },
  { id: 'Ocio',         label: 'Diversión',  emoji: '🎬' },
  { id: 'Salud',        label: 'Salud',      emoji: '❤️' },
  { id: 'Compras',      label: 'Compras',    emoji: '🛍️' },
  { id: 'Otros',        label: 'Otros',      emoji: '···' },
];

// Categorías para movimientos de tipo "ingreso"
const CATEGORIAS_INGRESO = [
  { id: 'Sueldo',        label: 'Sueldo',        emoji: '💼' },
  { id: 'Ingreso extra', label: 'Ingreso extra', emoji: '➕' },
  { id: 'Otros',         label: 'Otros',         emoji: '···' },
];

// Categoría por defecto según el tipo de movimiento
const categoriaPorDefecto = (tipo) =>
  tipo === 'ingreso' ? CATEGORIAS_INGRESO[0].id : CATEGORIAS_GASTO[0].id;

// Mapea lo que devuelve el backend (OCR) a nuestras categorías internas de gasto
const mapearCategoria = (categoriaOCR) => {
  if (!categoriaOCR) return 'Otros';
  // Normalizar: quitar tildes y pasar a minúsculas para comparar
  const normalizar = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const lower = normalizar(categoriaOCR);

  // Mapeo directo de los valores exactos que devuelve el backend
  if (lower === 'comida')      return 'Alimentación';
  if (lower === 'transporte')  return 'Transporte';
  if (lower === 'diversion')   return 'Ocio';
  if (lower === 'salud')       return 'Salud';
  if (lower === 'compras')     return 'Compras';

  // Fallback por palabras clave (por si el modelo responde diferente)
  if (lower.includes('comida') || lower.includes('restaurante') || lower.includes('aliment') || lower.includes('cafe')) return 'Alimentación';
  if (lower.includes('transporte') || lower.includes('taxi') || lower.includes('uber') || lower.includes('bus')) return 'Transporte';
  if (lower.includes('diversion') || lower.includes('ocio') || lower.includes('cine') || lower.includes('entretenimiento')) return 'Ocio';
  if (lower.includes('salud') || lower.includes('farmacia') || lower.includes('medico')) return 'Salud';
  if (lower.includes('compra') || lower.includes('supermercado') || lower.includes('tienda') || lower.includes('ropa')) return 'Compras';

  return 'Otros';
};

// Formatea fecha de OCR (varios formatos posibles) a YYYY-MM-DD
const normalizarFecha = (fechaStr) => {
  if (!fechaStr) return new Date().toISOString().slice(0, 10);
  // Si ya viene en formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) return fechaStr;
  // Intentar parsear
  try {
    const d = new Date(fechaStr);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
  } catch (_) {}
  return new Date().toISOString().slice(0, 10);
};

export const Registro = () => {
  const navigate         = useNavigate();
  const fileInputRef     = useRef(null);

  const [tipoMovimiento, setTipoMovimiento] = useState('gasto');
  const [monto,          setMonto]          = useState('');
  const [categoria,      setCategoria]      = useState(categoriaPorDefecto('gasto'));
  const [nota,           setNota]           = useState('');
  const [fecha,          setFecha]          = useState(new Date().toISOString().slice(0, 10));

  // ── Estado OCR / UI ────────────────────────────────────────────────
  const [ocrData,     setOcrData]    = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loadingOCR,  setLoadingOCR] = useState(false);
  const [saving,      setSaving]     = useState(false);
  const [error,       setError]      = useState('');
  const [ocrError,    setOcrError]   = useState('');

  // ── Estado OCR en tiempo real (cámara) ──────────────────────────────
  const videoRef        = useRef(null);
  const captureCanvasRef = useRef(null);   // canvas oculto: captura a resolución completa
  const stabilityCanvasRef = useRef(null); // canvas oculto: muestreo de baja resolución para detectar estabilidad
  const streamRef       = useRef(null);
  const stabilityTimerRef = useRef(null);
  const prevFrameRef    = useRef(null);
  const stableTicksRef  = useRef(0);
  const ocrErrorRef     = useRef(''); // copia de ocrError legible sin esperar al re-render

  const [showCamera,    setShowCamera]    = useState(false);
  const [cameraPhase,   setCameraPhase]   = useState('live'); // 'live' | 'processing' | 'error'
  const [cameraError,   setCameraError]   = useState('');
  const [isStable,      setIsStable]      = useState(false);
  const [facingMode,    setFacingMode]    = useState('environment'); // 'environment' | 'user'

  // ── Categorías visibles según el tipo de movimiento seleccionado ───
  const categoriasDisponibles =
    tipoMovimiento === 'ingreso' ? CATEGORIAS_INGRESO : CATEGORIAS_GASTO;

  // ── Handlers de monto ──────────────────────────────────────────────
  const handleMonto = (e) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    if (val.split('.').length > 2) return;
    setMonto(val);
    if (error) setError('');
  };

  // ── Escanear factura con OCR (compartido: subida de archivo y cámara) ─
  // Retorna true si se extrajo información correctamente.
  const runOCR = async (file) => {
    try {
      const result = await scanInvoice(file);

      if (!result.success || !result.data) {
        setOcrError(result.message || 'No se pudo extraer información del documento.');
        return false;
      }

      setOcrData(result.data);
      setShowPreview(true);
      return true;
    } catch (err) {
      setOcrError(err.message || 'Error al procesar la imagen.');
      return false;
    }
  };

  // ── Escanear factura subiendo una imagen desde el dispositivo ───────
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Resetear input para permitir re-selección del mismo archivo
    e.target.value = '';

    setOcrError('');
    setLoadingOCR(true);
    await runOCR(file);
    setLoadingOCR(false);
  };

  // ── Cámara en tiempo real ─────────────────────────────────────────
  const STABILITY_CHECK_MS   = 150;  // frecuencia de muestreo
  const STABILITY_THRESHOLD  = 6;    // diferencia promedio de píxel permitida (0-255)
  const STABLE_TICKS_NEEDED  = 6;    // ~900ms quieto antes de auto-capturar

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const stopStabilityLoop = () => {
    if (stabilityTimerRef.current) {
      clearInterval(stabilityTimerRef.current);
      stabilityTimerRef.current = null;
    }
    prevFrameRef.current = null;
    stableTicksRef.current = 0;
    setIsStable(false);
  };

  // Compara el frame actual con el anterior (a baja resolución) para
  // saber si la cámara está quieta y así auto-capturar la factura.
  const checkStability = useCallback(() => {
    const video = videoRef.current;
    const canvas = stabilityCanvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const w = 48, h = 36;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    if (prevFrameRef.current) {
      let diffSum = 0;
      for (let i = 0; i < data.length; i += 4) {
        diffSum += Math.abs(data[i] - prevFrameRef.current[i]);
      }
      const avgDiff = diffSum / (data.length / 4);

      if (avgDiff < STABILITY_THRESHOLD) {
        stableTicksRef.current += 1;
      } else {
        stableTicksRef.current = 0;
        setIsStable(false);
      }

      if (stableTicksRef.current >= STABLE_TICKS_NEEDED) {
        setIsStable(true);
        stopStabilityLoop();
        captureFrame();
      }
    }

    prevFrameRef.current = data;
  }, []);

  const startStabilityLoop = () => {
    stopStabilityLoop();
    stabilityTimerRef.current = setInterval(checkStability, STABILITY_CHECK_MS);
  };

  const openCamera = async (mode = facingMode) => {
    setCameraError('');
    setOcrError('');
    setCameraPhase('live');
    setShowCamera(true);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Este navegador no permite acceder a la cámara. Prueba subir una foto en su lugar.');
      setCameraPhase('error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      startStabilityLoop();
    } catch (err) {
      setCameraError(
        err?.name === 'NotAllowedError'
          ? 'Necesitamos permiso de cámara para escanear en vivo. Habilítalo en los ajustes del navegador.'
          : 'No se pudo acceder a la cámara. Prueba subir una foto en su lugar.'
      );
      setCameraPhase('error');
    }
  };

  const closeCamera = () => {
    stopStabilityLoop();
    stopStream();
    setShowCamera(false);
    setCameraPhase('live');
    setCameraError('');
  };

  const switchCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    stopStabilityLoop();
    stopStream();
    openCamera(next);
  };

  // Toma el frame actual del video, lo convierte a archivo y lo procesa con OCR.
  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setCameraError('No se pudo capturar la imagen. Intenta de nuevo.');
        setCameraPhase('error');
        return;
      }

      // Detenemos el análisis de estabilidad pero dejamos el stream activo
      // por si el usuario necesita reintentar sin volver a pedir permisos.
      stopStabilityLoop();
      setCameraPhase('processing');
      setOcrError('');

      const file = new File([blob], `captura-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const success = await runOCR(file);

      if (success) {
        closeCamera();
      } else {
        setCameraError(ocrErrorRef.current || 'No se pudo extraer información. Intenta de nuevo.');
        setCameraPhase('error');
      }
    }, 'image/jpeg', 0.92);
  };

  const handleManualCapture = () => {
    if (cameraPhase !== 'live') return;
    stopStabilityLoop();
    captureFrame();
  };

  const retryCamera = () => {
    setCameraError('');
    setCameraPhase('live');
    if (streamRef.current) {
      startStabilityLoop();
    } else {
      openCamera();
    }
  };

  // Mantiene ocrErrorRef sincronizado para leerlo dentro de captureFrame
  // sin depender del ciclo de renders de React.
  useEffect(() => { ocrErrorRef.current = ocrError; }, [ocrError]);

  // Limpieza al desmontar el componente: apaga la cámara si quedó abierta.
  useEffect(() => {
    return () => {
      stopStabilityLoop();
      stopStream();
    };
  }, []);

  // ── Aceptar datos del OCR y pre-llenar formulario ──────────────────
  const handleAcceptOCR = () => {
    if (!ocrData) return;

    // El OCR siempre extrae facturas/comprobantes, así que el movimiento
    // resultante se trata como un gasto.
    setTipoMovimiento('gasto');

    // Monto
    if (ocrData.monto_total && ocrData.monto_total > 0) {
      setMonto(String(ocrData.monto_total));
    }

    // Categoría — usar el campo categoria que devuelve el backend directamente
    const catFuente = ocrData.categoria || ocrData.descripcion;
    setCategoria(mapearCategoria(catFuente));

    // Fecha
    if (ocrData.fecha) {
      setFecha(normalizarFecha(ocrData.fecha));
    }

    // Nota: nombre del proveedor
    if (ocrData.proveedor) {
      setNota(ocrData.proveedor);
    }

    setShowPreview(false);
  };

  // ── Cerrar modal OCR sin aceptar ───────────────────────────────────
  const handleClosePreview = () => {
    setShowPreview(false);
    setOcrData(null);
  };

  // ── Guardar movimiento en backend → Firestore ───────────────────────
  const handleGuardar = async () => {
    const num = parseFloat(monto);
    if (!monto || isNaN(num) || num <= 0) {
      setError('Ingresa un monto válido para continuar.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await createMovement({
        tipo:        tipoMovimiento,    // 'gasto' o 'ingreso', según lo seleccionado
        monto:       num,
        categoria:   categoria,
        fecha:       fecha,
        descripcion: nota || categoria,
        moneda:      'COP',
        origen:      'manual',
      });

      navigate('/movimientos');
    } catch (err) {
      setError(err.message || `No fue posible guardar el ${tipoMovimiento}. Intenta de nuevo.`);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="rg-wrapper">

      {/* Header */}
      <header className="rg-header">
        <button className="rg-back" onClick={() => navigate('/dashboard')}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Monetra
        </button>
        <button className="rg-icon-btn" aria-label="Notificaciones">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.437L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
      </header>

      <main className="rg-main">

        {/* Título */}
        <div className="rg-title-block">
          <h1 className="rg-title">
            Nuevo {tipoMovimiento}
          </h1>
          <p className="rg-subtitle">
            {tipoMovimiento === 'gasto'
              ? 'Registra tus gastos rápidamente para mantener tu salud financiera.'
              : 'Registra tus ingresos para llevar el control de tu dinero.'}
          </p>
        </div>

        {/* ── Monto ─────────────────────────────────────────────────── */}
        <div className="rg-amount-card">
          <p className="rg-amount-label">
            Monto del {tipoMovimiento}
          </p>
          <div className="rg-amount-row">
            <span className="rg-dollar">$</span>
            <input
              className="rg-amount-input"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={monto}
              onChange={handleMonto}
              aria-label={`Monto del ${tipoMovimiento}`}
            />
          </div>

          {error && <p className="rg-error">{error}</p>}

          {/* Fecha */}
          <div style={{ width: '100%', marginTop: '0.25rem' }}>
            <p className="rg-amount-label" style={{ marginBottom: '0.25rem' }}>Fecha</p>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="rg-note-input"
              style={{ fontSize: '0.9rem' }}
            />
          </div>

          {/* Botones escanear */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <div className="rg-scan-actions">
            <button
              className="rg-scan-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={loadingOCR}
            >
              {loadingOCR ? (
                <>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0114.6-3.6M20 15a9 9 0 01-14.6 3.6" />
                  </svg>
                  Procesando...
                </>
              ) : (
                <>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M9 3H5a2 2 0 00-2 2v4m0 6v4a2 2 0 002 2h4m6-18h4a2 2 0 012 2v4m0 6v4a2 2 0 01-2 2h-4" />
                  </svg>
                  Subir imagen
                </>
              )}
            </button>

            <button
              className="rg-scan-btn rg-scan-btn--live"
              onClick={() => openCamera()}
              disabled={loadingOCR}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              Escanear en vivo
            </button>
          </div>

          {ocrError && !showCamera && (
            <p className="rg-error" style={{ textAlign: 'center' }}>{ocrError}</p>
          )}
        </div>

        {/* Tipo de movimiento */}
        <div className="rg-section">
          <span className="rg-section-label">Tipo de movimiento</span>
          <div className="rg-type-toggle">
            <button
              className={`rg-type-btn${tipoMovimiento === 'gasto' ? ' rg-type-btn--active rg-type-btn--gasto' : ''}`}
              onClick={() => { setTipoMovimiento('gasto'); setCategoria(categoriaPorDefecto('gasto')); }}
              type="button"
            >
              <span className="rg-type-btn-emoji">💸</span>
              <span className="rg-type-btn-label">Gasto</span>
            </button>
            <button
              className={`rg-type-btn${tipoMovimiento === 'ingreso' ? ' rg-type-btn--active rg-type-btn--ingreso' : ''}`}
              onClick={() => { setTipoMovimiento('ingreso'); setCategoria(categoriaPorDefecto('ingreso')); }}
              type="button"
            >
              <span className="rg-type-btn-emoji">💰</span>
              <span className="rg-type-btn-label">Ingreso</span>
            </button>
          </div>
        </div>

        {/* ── Categorías ──────────────────────────────────────────── */}
        <div className="rg-section">
          <div className="rg-section-row">
            <span className="rg-section-label">Categoría</span>
          </div>
          <div className="rg-cat-grid">
            {categoriasDisponibles.map((cat) => (
              <button
                key={cat.id}
                className={`rg-cat${categoria === cat.id ? ' rg-cat--active' : ''}`}
                onClick={() => setCategoria(cat.id)}
              >
                <span className="rg-cat-emoji" aria-hidden="true">{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Nota ─────────────────────────────────────────────────── */}
        <div className="rg-section">
          <span className="rg-section-label">Nota (opcional)</span>
          <input
            className="rg-note-input"
            type="text"
            placeholder={
              tipoMovimiento === 'ingreso'
                ? '¿De dónde viene este ingreso? (ej: Nómina junio)'
                : '¿En qué gastaste esto? (ej: Carulla)'
            }
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            aria-label="Nota opcional"
          />
        </div>

        {/* ── Guardar ─────────────────────────────────────────────── */}
        <button
          className="rg-save-btn"
          onClick={handleGuardar}
          disabled={saving}
        >
          {saving ? 'Guardando...' : `Guardar ${tipoMovimiento}`}
        </button>

      </main>

      {/* ── Modal preview OCR ────────────────────────────────────────── */}
      {showPreview && ocrData && (
        <div className="ocr-overlay" onClick={handleClosePreview}>
          <div className="ocr-modal" onClick={(e) => e.stopPropagation()}>

            {/* Cabecera */}
            <div className="ocr-modal-header">
              <div className="ocr-scanning-indicator">
                <div className="ocr-scan-dot" />
                <span>Extrayendo datos...</span>
              </div>
              <button className="ocr-close-btn" onClick={handleClosePreview}>×</button>
            </div>

            {/* Cuerpo de datos */}
            <div className="ocr-modal-body">

              <div className="ocr-field-row">
                <div className="ocr-field">
                  <span className="ocr-field-label">COMERCIO</span>
                  <span className="ocr-field-value">{ocrData.proveedor || '—'}</span>
                </div>
                <div className="ocr-field">
                  <span className="ocr-field-label">FECHA</span>
                  <span className="ocr-field-value">
                    {ocrData.fecha ? normalizarFecha(ocrData.fecha).split('-').reverse().join('/') : '—'}
                  </span>
                </div>
              </div>

              <div className="ocr-field-row">
                <div className="ocr-field">
                  <span className="ocr-field-label">CATEGORÍA</span>
                  <span className="ocr-field-value ocr-category-pill">
                    {CATEGORIAS_GASTO.find(c => c.id === mapearCategoria(ocrData.categoria || ocrData.descripcion))?.emoji || '···'}{' '}
                    {CATEGORIAS_GASTO.find(c => c.id === mapearCategoria(ocrData.categoria || ocrData.descripcion))?.label || 'Otros'}
                  </span>
                </div>
                <div className="ocr-field">
                  <span className="ocr-field-label">TOTAL</span>
                  <span className="ocr-field-value ocr-amount">
                    {ocrData.monto_total
                      ? Number(ocrData.monto_total).toLocaleString('es-CO')
                      : '—'}
                  </span>
                </div>
              </div>

              {ocrData.notas && (
                <div className="ocr-field" style={{ marginTop: '0.5rem' }}>
                  <span className="ocr-field-label">NOTAS OCR</span>
                  <span className="ocr-field-value" style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    {ocrData.notas}
                  </span>
                </div>
              )}

              {/* Confianza */}
              <div className="ocr-confidence">
                <span className={`ocr-confidence-badge ocr-confidence-${ocrData.confianza || 'baja'}`}>
                  Confianza: {ocrData.confianza || 'baja'}
                </span>
              </div>
            </div>

            {/* Acción */}
            <button className="ocr-accept-btn" onClick={handleAcceptOCR}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Aceptar gasto
            </button>

          </div>
        </div>
      )}

      {/* ── Modal cámara en vivo ─────────────────────────────────────── */}
      {showCamera && (
        <div className="cam-overlay">
          <div className="cam-modal">

            <div className="cam-header">
              <span className="cam-title">Escanear en vivo</span>
              <div className="cam-header-actions">
                {cameraPhase === 'live' && (
                  <button className="cam-icon-btn" onClick={switchCamera} aria-label="Cambiar cámara">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0114.6-3.6M20 15a9 9 0 01-14.6 3.6" />
                    </svg>
                  </button>
                )}
                <button className="cam-icon-btn" onClick={closeCamera} aria-label="Cerrar cámara">×</button>
              </div>
            </div>

            <div className="cam-video-wrap">
              <video ref={videoRef} className="cam-video" muted playsInline />

              {cameraPhase === 'live' && (
                <div className={`cam-guide${isStable ? ' cam-guide--stable' : ''}`}>
                  <span className="cam-corner cam-corner--tl" />
                  <span className="cam-corner cam-corner--tr" />
                  <span className="cam-corner cam-corner--bl" />
                  <span className="cam-corner cam-corner--br" />
                </div>
              )}

              {cameraPhase === 'processing' && (
                <div className="cam-processing-overlay">
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0114.6-3.6M20 15a9 9 0 01-14.6 3.6" />
                  </svg>
                  <span>Extrayendo datos...</span>
                </div>
              )}

              {cameraPhase === 'error' && (
                <div className="cam-processing-overlay">
                  <p className="cam-error-text">{cameraError}</p>
                  <button className="cam-retry-btn" onClick={retryCamera}>Reintentar</button>
                </div>
              )}
            </div>

            <div className="cam-footer">
              {cameraPhase === 'live' ? (
                <>
                  <p className="cam-hint">
                    {isStable ? 'Capturando...' : 'Encuadra la factura y mantén el teléfono firme'}
                  </p>
                  <button className="cam-shutter-btn" onClick={handleManualCapture} aria-label="Capturar foto">
                    <span className="cam-shutter-inner" />
                  </button>
                </>
              ) : (
                <p className="cam-hint">&nbsp;</p>
              )}
            </div>

            {/* Canvas ocultos usados para capturar y para medir estabilidad */}
            <canvas ref={captureCanvasRef} style={{ display: 'none' }} />
            <canvas ref={stabilityCanvasRef} style={{ display: 'none' }} />

          </div>
        </div>
      )}

      <BottomNav />

    </div>
  );
};