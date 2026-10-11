import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/primitives';

/* First line of defense only — the backend re-authorizes every request. */
export default function RequireRole({ roles, children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  // Super admin has universal access across all dashboard sections
  if (user.role === 'super_admin' || user.rawRole === 'SUPER_ADMIN' || user.role === 'SUPER_ADMIN') {
    return children;
  }
  if (!roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return children;
}
