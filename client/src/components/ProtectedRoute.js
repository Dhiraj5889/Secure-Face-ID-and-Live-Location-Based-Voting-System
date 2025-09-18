import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, userType, requiredPermissions = [] }) => {
  const { isAuthenticated, userType: currentUserType, user } = useAuth();
  const location = useLocation();

  // Check if user is authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user type matches required type
  if (userType && currentUserType !== userType) {
    return <Navigate to="/" replace />;
  }

  // Check if user has required permissions (for admin users)
  if (requiredPermissions.length > 0 && currentUserType === 'admin') {
    const hasPermission = requiredPermissions.every(permission => 
      user?.permissions?.includes(permission)
    );
    
    if (!hasPermission) {
      return <Navigate to="/" replace />;
    }
  }

  // Check if voter is verified
  if (currentUserType === 'voter' && !user?.isVerified) {
    return <Navigate to="/verification-pending" replace />;
  }

  return children;
};

export default ProtectedRoute;
