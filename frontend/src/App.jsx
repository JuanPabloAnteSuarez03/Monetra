import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ui/ProtectedRoute'
import LoginView from './views/auth/LoginView'
import RegisterView from './views/auth/RegisterView'
import DashboardView from './views/dashboard/DashboardView'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginView />} />
        <Route path="/register" element={<RegisterView />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardView /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
