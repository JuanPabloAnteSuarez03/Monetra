import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ui/ProtectedRoute";
import { LoginView } from "./views/auth/LoginView";
import { RegisterView } from "./views/auth/RegisterView";
import { DashboardView } from "./views/dashboard/DashboardView";
import { Registro } from "./views/registro/Registro";
import { MovimientosView } from "./views/movimientos/MovimientosView";
import { SavingsView } from "./views/ahorros/SavingsView";
import { AnalisisView } from "./views/analisis/AnalisisView";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/login" element={<LoginView />} />
          <Route path="/register" element={<RegisterView />} />

          {/* Rutas Privadas Protegidas */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/registro"
            element={
              <ProtectedRoute>
                <Registro />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analisis"
            element={
              <ProtectedRoute>
                <AnalisisView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ahorros"
            element={
              <ProtectedRoute>
                <SavingsView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/movimientos"
            element={
              <ProtectedRoute>
                <MovimientosView />
              </ProtectedRoute>
            }
          />

          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
