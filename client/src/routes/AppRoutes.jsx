import { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/authContext';
import { AppLayout } from '../layouts/AppLayout';

import { Login } from '../pages/Login';
import { Register } from '../pages/Register';
import { CheckEmailPage } from '../pages/CheckEmailPage';
import { VerifyEmailPage } from '../pages/VerifyEmailPage';
import { ProfileSetup } from '../pages/ProfileSetup';
import { Dashboard } from '../pages/Dashboard';
import { EMAIL_VERIFICATION_ENABLED } from '../config/features';

import { Nutrition } from '../pages/Nutrition';
import { Workouts } from '../pages/Workouts';
import { Tracking } from '../pages/Tracking';
import { Profile } from '../pages/Profile';
import { Goals } from '../pages/Goals';
import { Settings } from '../pages/Settings';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  
  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="skeleton" style={{ width: '50px', height: '50px', borderRadius: '50%' }}></div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  
  return children;
};

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      {EMAIL_VERIFICATION_ENABLED && (
        <>
          <Route path="/check-email" element={<PublicRoute><CheckEmailPage /></PublicRoute>} />
          <Route path="/verify-email" element={<PublicRoute><VerifyEmailPage /></PublicRoute>} />
        </>
      )}
      <Route path="/profile/setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
      
      {/* Protected routes wrapped in AppLayout */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/nutrition" element={<Nutrition />} />
        <Route path="/workouts" element={<Workouts />} />
        <Route path="/progress" element={<Tracking />} />
        <Route path="/tracking" element={<Tracking />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
