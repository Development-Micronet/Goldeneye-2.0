import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import React from "react";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterCompanyPage } from "../features/auth/pages/RegisterCompanyPage";
import { ResetPasswordPage } from "../features/auth/pages/ResetPasswordPage";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { DataPage } from "../features/data/pages/DataPage";
import { ManagePage } from "../features/manage/pages/ManagePage";
import { QuotationPage } from "../features/quotation/pages/QuotationPage";
import MainLayout from "../layouts/MainLayout";
import { useAuthStore } from "../store/useAuthStore";
import EarthMap from "../features/analytics/EarthMapview";
import { ForceResetPasswordPage } from "../features/auth/pages/ForceResetPasswordPage";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  if (!token) {
    // Redirect to login if user isn't authenticated
    return <Navigate to="/login" replace />;
  }

  // return <>{children}</>;
  // If password reset is forced, block them from normal pages and redirect to reset page
  if (user?.must_reset_password) {
    return <Navigate to="/force-reset-password" replace />;
  }
  return <>{children}</>;
};
// Route guard for the Force Reset Password page
const ForceResetPasswordRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  // If the user already reset their password, redirect them back to the dashboard
  if (!user?.must_reset_password) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register-company" element={<RegisterCompanyPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        {/* Force Reset Password (Authenticated but blocked from rest of the app) */}
        <Route
          path="/force-reset-password"
          element={
            <ForceResetPasswordRoute>
              <ForceResetPasswordPage />
            </ForceResetPasswordRoute>
          }
        />
        {/* Protected Routes inside MainLayout */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/data" element={<DataPage />} />
          <Route path="/manage" element={<ManagePage />} />
          <Route path="/quotation" element={<QuotationPage />} />
          <Route path="/Libre" element={<EarthMap />} />
          {/* Default entry redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Default fallback route redirecting to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
