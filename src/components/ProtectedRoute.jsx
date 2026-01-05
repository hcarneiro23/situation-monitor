import React from 'react';
import { useAuth } from '../context/AuthContext';
import LoginPage from './LoginPage';
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-intel-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-accent-blue animate-spin mx-auto" />
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return children;
}

export default ProtectedRoute;
