import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute() {
  const { admin, loading } = useAuth();

  if (loading) return <div className="page-loading">Loading...</div>;
  if (!admin) return <Navigate to="/login" replace />;

  return <Outlet />;
}
