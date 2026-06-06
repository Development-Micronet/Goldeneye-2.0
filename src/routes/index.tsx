import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterCompanyPage } from "../features/auth/pages/RegisterCompanyPage";
import { useAuthStore } from "../store/useAuthStore";
import MainLayout from "../layouts/MainLayout";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { DataPage } from "../features/data/pages/DataPage";
import { ManagePage } from "../features/manage/pages/ManagePage";
import { QuotationPage } from "../features/quotation/pages/QuotationPage";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = useAuthStore((state) => state.accessToken);

  if (!token) {
    // Redirect to login if user isn't authenticated
    return <Navigate to="/login" replace />;
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
          {/* Default entry redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Default fallback route redirecting to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
