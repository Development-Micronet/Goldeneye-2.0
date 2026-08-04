import React from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "../Auth/AuthProvider/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactElement;
  notAllowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, notAllowedRoles = [] }) => {
  const { user, role } = useUser();

  if (user) {
    if (notAllowedRoles.includes(role)) {
      return <Navigate to="/" />;
    } else {
      return children;
    }
  } else {
    return <Navigate to="/" />;
  }
};

export default ProtectedRoute;
