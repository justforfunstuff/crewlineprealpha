import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

export default function RequireRole({ roles }: { roles: UserRole[] }) {
  const { profile, loading } = useAuth();

  if (loading) return null;

  if (!profile || !roles.includes(profile.role)) {
    const redirect = profile?.role === 'crewline_admin' ? '/admin' : '/';
    return <Navigate to={redirect} replace />;
  }

  return <Outlet />;
}
