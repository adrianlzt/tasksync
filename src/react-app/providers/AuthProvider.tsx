import { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isPending: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isPending, setIsPending] = useState(true);

  const checkUserSession = useCallback(async () => {
    try {
      const response = await fetch('/api/users/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user session:', error);
      setUser(null);
    } finally {
      setIsPending(false);
    }
  }, []);


  useEffect(() => {
    checkUserSession();
  }, [checkUserSession]);

  const logout = async () => {
    try {
      await fetch('/api/logout', { method: 'GET' });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
    }
  };

  const value = { user, setUser, isPending, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
