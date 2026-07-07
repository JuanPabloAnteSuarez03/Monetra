// src/views/ahorros/SavingsView.jsx
import { useState } from 'react';
import { AppHeader } from '../../components/layout/AppHeader';
import { BottomNav } from '../../components/layout/BottomNav';
import { useSavings } from '../../hooks/useSavings'; 
import './SavingsView.css';

export const SavingsView = () => {
  const [seccionActiva, setSeccionActiva] = useState('ahorros');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalForm, setGoalForm] = useState({ nombre: '', monto: '', fechaEstimada: '' });
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [selectedGoalNombre, setSelectedGoalNombre] = useState('');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionType, setTransactionType] = useState('abono'); // 'abono' or 'retiro'

  const [showEditModal, setShowEditModal] = useState(false);
  const [editGoalForm, setEditGoalForm] = useState({ nombre: '', montoObjetivo: '', fechaEstimada: '' });

  // Consumo del Hook real sincronizado mediante Fetch
  const { progresos, resumen, loading, addGoal, saveAbono, saveRetiro, deleteGoal, updateGoal } = useSavings();

  // Genera el historial dinámico mapeando los ahorros actuales
  const historialAbonos = progresos.reduce((acc, goal) => {
    if (goal.montoActual > 0) {
      acc.push({
        id: `log-${goal.id}`,
        metaNombre: goal.nombre,
        monto: goal.montoActual, 
        fecha: new Date().toLocaleDateString('es-CO'),
        tipo: 'Abono Exitoso'
      });
    }
    return acc;
  }, []);

  const handleGoalFormChange = (e) => {
    const { name, value } = e.target;
    setGoalForm(prev => ({ ...prev, [name]: value }));
  };

  const handleGoalSubmit = async (e) => {
    e.preventDefault();
    setIsCreatingGoal(true);
    const res = await addGoal(goalForm);
    setIsCreatingGoal(false);
    if (res?.exito) {
      setShowGoalModal(false);
      setGoalForm({ nombre: '', monto: '', fechaEstimada: '' });
    }
  };

  const handleOpenTransactionModal = (goalId, goalNombre, type) => {
    setSelectedGoalId(goalId);
    setSelectedGoalNombre(goalNombre);
    setTransactionAmount('');
    setTransactionType(type);
    setShowTransactionModal(true);
  };

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    
    const montoNumerico = parseFloat(transactionAmount);
    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      alert("Por favor, ingresa un monto válido.");
      return;
    }

    // Validación para retiros: no permitir retirar más de lo ahorrado
    if (transactionType === 'retiro') {
      const goal = progresos.find(g => g.id === selectedGoalId);
      const montoActual = goal?.montoActual || 0;
      if (montoNumerico > montoActual) {
        alert(`No puedes retirar más de lo que tienes ahorrado. Tu ahorro actual es ${formatCurrency(montoActual)}.`);
        return;
      }
    }

    let res;
    if (transactionType === 'abono') {
      res = await saveAbono(selectedGoalId, montoNumerico);
      if (res?.exito) {
        // ACTUALIZACIÓN OPTIMISTA LOCAL:
        if (progresos && progresos.length > 0) {
          const metaIndex = progresos.findIndex(g => g.id === selectedGoalId);
          if (metaIndex !== -1) {
            const meta = progresos[metaIndex];
            const nuevoMonto = (meta.montoActual || 0) + montoNumerico;
            const maxTarget = meta.monto_objetivo || meta.montoTarget || meta.montoObjetivo || 1;
            meta.montoActual = nuevoMonto;
            meta.porcentajeAvance = (nuevoMonto / maxTarget) * 100;
          }
        }
      } else {
        alert("Hubo un problema al registrar el abono en el servidor.");
        return;
      }
    } else {
      res = await saveRetiro(selectedGoalId, montoNumerico);
      if (res?.exito) {
        // ACTUALIZACIÓN OPTIMISTA LOCAL:
        if (progresos && progresos.length > 0) {
          const metaIndex = progresos.findIndex(g => g.id === selectedGoalId);
          if (metaIndex !== -1) {
            const meta = progresos[metaIndex];
            const nuevoMonto = Math.max(0, (meta.montoActual || 0) - montoNumerico);
            const maxTarget = meta.monto_objetivo || meta.montoTarget || meta.montoObjetivo || 1;
            meta.montoActual = nuevoMonto;
            meta.porcentajeAvance = (nuevoMonto / maxTarget) * 100;
          }
        }
      } else {
        alert("Hubo un problema al registrar el retiro en el servidor.");
        return;
      }
    }

    setShowTransactionModal(false);
    setTransactionAmount('');
  };

  const handleOpenEditModal = (goal) => {
    setSelectedGoalId(goal.id);
    setEditGoalForm({
      nombre: goal.nombre,
      montoObjetivo: goal.monto_objetivo || goal.montoTarget || goal.montoObjetivo,
      fechaEstimada: goal.fechaEstimada
    });
    setShowEditModal(true);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditGoalForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const res = await updateGoal(selectedGoalId, editGoalForm);
    if (res?.exito) {
      setShowEditModal(false);
      setEditGoalForm({ nombre: '', montoObjetivo: '', fechaEstimada: '' });
    } else {
      alert("Hubo un problema al actualizar la meta.");
    }
  };

  const handleDeleteGoal = async () => {
    if (confirm('¿Estás seguro de que deseas eliminar esta meta de ahorro?')) {
      const res = await deleteGoal(selectedGoalId);
      if (res?.exito) {
        setShowEditModal(false);
        setEditGoalForm({ nombre: '', montoObjetivo: '', fechaEstimada: '' });
      } else {
        alert("Hubo un problema al eliminar la meta.");
      }
    }
  };

  const formatCurrency = (amount) => {
    return '$' + (amount || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });
  };

  return (
    <div className="savings-container">
      <AppHeader seccionActiva={seccionActiva} setSeccionActiva={setSeccionActiva} />

      <main className="savings-main">
        {loading && <div className="loading-bar-pulse">Sincronizando con Monetra...</div>}

        {/* Tarjeta de Ahorros Totales */}
        <div className="savings-overview-card-unified">
          <div className="savings-monthly-panel">
            <p className="savings-monthly-label">Ahorros totales acumulados</p>
            <p className="savings-monthly-amount">
              {formatCurrency(progresos.reduce((sum, g) => sum + (g.montoActual || 0), 0))}
            </p>
            <div className="savings-monthly-badge">
              Resumen de avance: {resumen ? `${resumen.promedioAvanceGeneral || 0}%` : '0%'}
            </div>
          </div>
        </div>

        {/* SECCIÓN: Objetivos de Ahorro con Slider Horizontal */}
        <section className="savings-section">
          <div className="savings-section-header">
            <h2 className="savings-section-title">Tus objetivos de ahorro ({progresos.length})</h2>
          </div>
          
          <div className="savings-goals-slider">
            {progresos.length > 0 ? (
              progresos.map((goal) => (
                <div 
                  key={goal.id} 
                  className="savings-featured-goal-card"
                  onClick={() => handleOpenEditModal(goal)}
                >
                  <div className="featured-goal-header">
                    <span className="featured-goal-title">Meta: {goal.nombre}</span>
                  </div>

                  <div className="featured-goal-progress-row">
                    <div className="featured-progress-bar-wrapper">
                      <div 
                        className="featured-progress-bar-fill" 
                        style={{ width: `${Math.min(goal.porcentajeAvance || 0, 100)}%` }}
                      />
                    </div>
                    <span className="featured-progress-percentage-text">
                      {Math.round(goal.porcentajeAvance || 0)}%
                    </span>
                  </div>

                  <div className="featured-goal-footer">
                    <span className="featured-goal-amounts">
                      {formatCurrency(goal.montoActual)} / {formatCurrency(goal.monto_objetivo || goal.montoTarget || goal.montoObjetivo)}
                    </span>
                  </div>

                  <div className="featured-goal-actions" onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="goal-action-btn goal-action-btn-deposit"
                      onClick={() => handleOpenTransactionModal(goal.id, goal.nombre, 'abono')}
                    >
                      Abonar
                    </button>
                    <button 
                      className="goal-action-btn goal-action-btn-withdraw"
                      onClick={() => handleOpenTransactionModal(goal.id, goal.nombre, 'retiro')}
                    >
                      Retirar
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="savings-featured-goal-card empty" onClick={() => setShowGoalModal(true)}>
                <p>No tienes metas activas. Haz clic en el botón de abajo para fijar tu primer objetivo financiero.</p>
              </div>
            )}
          </div>
        </section>

        {/* Tarjeta Punteada de Acción */}
        <div className="create-goal-dashed-card" onClick={() => setShowGoalModal(true)}>
          <div className="create-goal-dashed-icon">+</div>
          <h3 className="create-goal-dashed-title">Crear un nuevo objetivo financiero</h3>
          <p className="create-goal-dashed-description">
            Fíjate una meta para tu próxima compra importante y deja que Monetra te ayude a organizarla.
          </p>
        </div>
      </main>

      {/* MODAL CREAR META */}
      {showGoalModal && (
        <div className="goal-modal-overlay">
          <div className="goal-modal">
            <div className="goal-modal-header">
              <h3 className="goal-modal-title">Nuevo Objetivo Financiero</h3>
              <button className="goal-modal-close" onClick={() => setShowGoalModal(false)}>✕</button>
            </div>
            <form onSubmit={handleGoalSubmit} className="goal-modal-form">
              <div className="goal-form-group">
                <label className="goal-form-label">Nombre del objetivo</label>
                <input 
                  type="text" name="nombre" value={goalForm.nombre} onChange={handleGoalFormChange}
                  placeholder="Ej. Computador, Viaje, Moto" className="goal-form-input" required 
                />
              </div>
              <div className="goal-form-group">
                <label className="goal-form-label">Monto objetivo (COP)</label>
                <input 
                  type="number" name="monto" value={goalForm.monto} onChange={handleGoalFormChange}
                  placeholder="Ej. 1800000" className="goal-form-input" required 
                />
              </div>
              <div className="goal-form-group">
                <label className="goal-form-label">Fecha estimada para cumplirlo</label>
                <input 
                  type="date" name="fechaEstimada" value={goalForm.fechaEstimada} onChange={handleGoalFormChange}
                  className="goal-form-input" required 
                />
              </div>
              <div className="goal-modal-actions">
                <button type="button" className="goal-modal-btn goal-modal-btn-cancel" onClick={() => setShowGoalModal(false)} disabled={isCreatingGoal}>Cancelar</button>
                <button type="submit" className="goal-modal-btn goal-modal-btn-submit" disabled={isCreatingGoal}>
                  {isCreatingGoal ? 'Creando...' : 'Crear Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR ABONO/RETIRO */}
      {showTransactionModal && (
        <div className="goal-modal-overlay">
          <div className="goal-modal">
            <div className="goal-modal-header">
              <h3 className="goal-modal-title">
                {transactionType === 'abono' ? `Registrar Abono a "${selectedGoalNombre}"` : `Registrar Retiro de "${selectedGoalNombre}"`}
              </h3>
              <button className="goal-modal-close" onClick={() => setShowTransactionModal(false)}>✕</button>
            </div>
            <form onSubmit={handleTransactionSubmit} className="goal-modal-form">
              <div className="goal-form-group">
                <label className="goal-form-label">
                  {transactionType === 'abono' ? 'Monto a depositar (COP)' : 'Monto a retirar (COP)'}
                </label>
                <input 
                  type="number" value={transactionAmount} onChange={(e) => setTransactionAmount(e.target.value)}
                  placeholder="Ej. 50000" className="goal-form-input" required 
                  autoFocus
                />
              </div>
              <div className="goal-modal-actions">
                <button type="button" className="goal-modal-btn goal-modal-btn-cancel" onClick={() => setShowTransactionModal(false)}>Cancelar</button>
                <button type="submit" className="goal-modal-btn goal-modal-btn-submit">
                  {transactionType === 'abono' ? 'Confirmar Abono' : 'Confirmar Retiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR META */}
      {showEditModal && (
        <div className="goal-modal-overlay">
          <div className="goal-modal">
            <div className="goal-modal-header">
              <h3 className="goal-modal-title">Editar Meta</h3>
              <button className="goal-modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit} className="goal-modal-form">
              <div className="goal-form-group">
                <label className="goal-form-label">Nombre del objetivo</label>
                <input 
                  type="text" name="nombre" value={editGoalForm.nombre} onChange={handleEditFormChange}
                  placeholder="Ej. Computador, Viaje, Moto" className="goal-form-input" required 
                />
              </div>
              <div className="goal-form-group">
                <label className="goal-form-label">Monto objetivo (COP)</label>
                <input 
                  type="number" name="montoObjetivo" value={editGoalForm.montoObjetivo} onChange={handleEditFormChange}
                  placeholder="Ej. 1800000" className="goal-form-input" required 
                />
              </div>
              <div className="goal-form-group">
                <label className="goal-form-label">Fecha estimada para cumplirlo</label>
                <input 
                  type="date" name="fechaEstimada" value={editGoalForm.fechaEstimada} onChange={handleEditFormChange}
                  className="goal-form-input" required 
                />
              </div>
              <div className="goal-modal-actions">
                <button type="button" className="goal-modal-btn goal-modal-btn-cancel" onClick={() => setShowEditModal(false)}>Cancelar</button>
                <button type="button" className="goal-modal-btn goal-modal-btn-delete" onClick={handleDeleteGoal}>Eliminar Meta</button>
                <button type="submit" className="goal-modal-btn goal-modal-btn-submit">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};