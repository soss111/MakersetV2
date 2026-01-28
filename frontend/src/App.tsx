import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HealthBanner } from './components/HealthBanner';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages (to be created)
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ShopPage from './pages/ShopPage';
import DashboardPage from './pages/DashboardPage';
import OrdersPage from './pages/OrdersPage';
import CatalogPage from './pages/CatalogPage';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AuthProvider>
            <HealthBanner />
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/" element={<Navigate to="/shop" replace />} />

              {/* Customer routes */}
              <Route
                path="/account"
                element={
                  <ProtectedRoute requiredRole="customer">
                    <div>Account Page (TODO)</div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute requiredRole="customer">
                    <OrdersPage />
                  </ProtectedRoute>
                }
              />

              {/* Provider routes */}
              <Route
                path="/provider/dashboard"
                element={
                  <ProtectedRoute requiredRole="provider">
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/provider/payments"
                element={
                  <ProtectedRoute requiredRole="provider">
                    <div>Payments Page (TODO)</div>
                  </ProtectedRoute>
                }
              />

              {/* Admin routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <div>Users Page (TODO)</div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/catalog"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <CatalogPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/sets"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <div>Set Builder Page (TODO)</div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/providers"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <div>Provider Management Page (TODO)</div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <div>System Settings Page (TODO)</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
