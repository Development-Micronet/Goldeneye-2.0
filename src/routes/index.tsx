import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import React from "react";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterCompanyPage } from "../features/auth/pages/RegisterCompanyPage";
import { ResetPasswordPage } from "../features/auth/pages/ResetPasswordPage";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { DataPage } from "../features/data/pages/DataPage";
import { ManagePage } from "../features/manage/pages/ManagePage";
import { QuotationPage } from "../features/quotation/pages/QuotationPage";
import Addtech from "../features/quotation/components/Addtech";
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
// If the user already reset their password, redirect them back to the dashboard/home
if (!user?.must_reset_password) {
  const role = user?.roleName?.toLowerCase();
  if (role === "user") {
    return <Navigate to="/data" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

  return <>{children}</>;
};

const HomeRedirect = () => {
  const user = useAuthStore((state) => state.user);
  const role = user?.roleName?.toLowerCase() || "";
  if (role === "user") {
    return <Navigate to="/data" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

interface RoleRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const RoleRoute: React.FC<RoleRouteProps> = ({ children, allowedRoles }) => {
  const user = useAuthStore((state) => state.user);
  const role = user?.roleName?.toLowerCase() || "";

  if (!allowedRoles.includes(role)) {
    return role === "user" ? <Navigate to="/data" replace /> : <Navigate to="/dashboard" replace />;
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
          <Route
            path="/dashboard"
            element={
              <RoleRoute allowedRoles={["superadmin", "admin"]}>
                <DashboardPage />
              </RoleRoute>
            }
          />
          <Route path="/data" element={<DataPage />} />
          <Route
            path="/manage"
            element={
              <RoleRoute allowedRoles={["superadmin", "admin"]}>
                <ManagePage />
              </RoleRoute>
            }
          />
          <Route
            path="/quotation"
            element={
              <RoleRoute allowedRoles={["superadmin"]}>
                <QuotationPage />
              </RoleRoute>
            }
          />
          <Route path="/Libre" element={<EarthMap />} />
          {/* Default entry redirect */}
          <Route path="/" element={<HomeRedirect />} />
        </Route>

        {/* Default fallback route redirecting to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
