"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Hook personnalisé pour vérifier l'authentification
 * @returns {Object} - { user, loading, logout }
 */
export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'authentification:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const refreshUser = () => {
    checkAuth();
  };

  return { user, loading, logout, refreshUser };
}

/**
 * Composant HOC pour protéger une page (nécessite authentification)
 */
export function withAuth(Component) {
  return function ProtectedRoute(props) {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
      if (!loading && !user) {
        router.push('/se-connecter');
      }
    }, [user, loading, router]);

    if (loading) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e5e7eb',
            borderTopColor: '#0b7d48',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }}></div>
          <p style={{ color: '#6b7280' }}>Vérification de l'authentification...</p>
        </div>
      );
    }

    if (!user) {
      return null;
    }

    return <Component {...props} user={user} />;
  };
}

