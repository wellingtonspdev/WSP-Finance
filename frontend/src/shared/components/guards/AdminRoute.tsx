import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../app/AuthProvider';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500">CARREGANDO...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.systemRole !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
