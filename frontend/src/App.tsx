import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Spinner } from './components/ui/Spinner';
import { useAuth } from './context/AuthContext';
import { ComposePage } from './pages/ComposePage';
import { EmailDetailPage } from './pages/EmailDetailPage';
import { InboxPage } from './pages/InboxPage';
import { LoginPage } from './pages/LoginPage';

// pages that need a login
function Protected({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-brand">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <Protected>
            <InboxPage />
          </Protected>
        }
      />
      <Route
        path="/compose"
        element={
          <Protected>
            <ComposePage />
          </Protected>
        }
      />
      <Route
        path="/emails/:id"
        element={
          <Protected>
            <EmailDetailPage />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
