
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'mentor' | 'intern';
}

const AuthGuard = ({ children, requiredRole }: AuthGuardProps) => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/auth');
        return;
      }

      if (requiredRole && role !== requiredRole) {
        // Redirect to appropriate dashboard based on user role
        switch (role) {
          case 'admin':
            navigate('/admin');
            break;
          case 'mentor':
            navigate('/mentor');
            break;
          case 'intern':
            navigate('/intern');
            break;
          default:
            navigate('/');
        }
      }
    }
  }, [user, role, loading, requiredRole, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-loomero-background flex items-center justify-center">
        <div className="text-loomero-text font-anta text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requiredRole && role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;
