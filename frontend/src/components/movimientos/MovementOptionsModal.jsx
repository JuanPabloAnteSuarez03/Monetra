import { useState } from 'react';
import './MovementOptionsModal.css';

export const MovementOptionsModal = ({
  movement,
  onClose,
  onSave,
  onDelete,
}) => {

  const [categoria, setCategoria] = useState(
    movement.categoria
  );
  const [showDeleteConfirm, setShowDeleteConfirm] =
  useState(false);
  const [descripcion, setDescripcion] = useState(
    movement.descripcion
  );
  const [monto, setMonto] = useState(
    movement.monto
  );
  const handleSave = () => {
    onSave({
      ...movement,
      categoria,
      descripcion,
      monto: Number(monto),
    });
  };

  return (
    <>
      <div
        className="options-overlay"
        onClick={onClose}
      >
        <div
          className="options-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="options-header">

            <h3 className="options-title">
              Editar movimiento
            </h3>

            <button
              className="close-btn"
              onClick={onClose}
            >
              ×
            </button>

          </div>

          <div className="form-group">
            <label>Descripción</label>

            <input
              value={descripcion}
              onChange={(e) =>
                setDescripcion(e.target.value)
              }
            />
          </div>

          <div className="form-group">
            <label>Monto</label>

            <input
              type="number"
              value={monto}
              onChange={(e) =>
                setMonto(e.target.value)
              }
            />
          </div>

          <div className="form-group">
            <label>Categoría</label>

            <select
              value={categoria}
              onChange={(e) =>
                setCategoria(e.target.value)
              }
            >
              <option>Comida</option>
              <option>Transporte</option>
              <option>Entretenimiento</option>
            </select>
          </div>

          <div className="options-actions">

            <button
              className="save-btn"
              onClick={handleSave}
            >
              Guardar cambios
            </button>

            <button
              className="delete-btn"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Eliminar
            </button>

          </div>

        </div>
      </div>
      {showDeleteConfirm && (
        <div
          className="confirm-overlay"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-icon">
              🗑️
            </div>

            <h3>
              ¿Eliminar movimiento?
            </h3>

            <p>
              Esta acción no se puede deshacer.
            </p>

            <div className="confirm-actions">

              <button
                className="cancel-confirm-btn"
                onClick={() =>
                  setShowDeleteConfirm(false)
                }
              >
                Cancelar
              </button>

              <button
                className="delete-confirm-btn"
                onClick={() => {
                  onDelete(movement.id);
                  setShowDeleteConfirm(false);
                }}
              >
                Sí, eliminar
              </button>

            </div>
          </div>
        </div>
      )}
    </>
  );
};

