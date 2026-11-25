import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { User } from '../types';
import { authService } from '../services/authService';
import { SESSION_EXPIRED } from '../lib/apiClient';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** How often a returning tab re-reads /auth/me at most. */
const RECHECK_MS = 60_000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userRef = useRef<User | null>(null);
  const lastCheck = useRef(0);

  const applyUser = useCallback((next: User | null) => {
    userRef.current = next;
    setUser(next);
  }, []);

  // Restore session from the persisted token / httpOnly cookie on every mount.
  useEffect(() => {
    authService.getCurrentUser().then((restoredUser) => {
      if (restoredUser) applyUser(restoredUser);
      lastCheck.current = Date.now();
    }).finally(() => {
      setIsLoading(false);
    });
  }, [applyUser]);

  // The session could not be renewed (expired, or the account was deleted or
  // suspended): sign out. ProtectedRoute then sends the student to /login.
  useEffect(() => {
    const onExpired = () => {
      if (!userRef.current) return;
      applyUser(null);
      toast.info('Your session has ended. Please sign in again.');
    };
    window.addEventListener(SESSION_EXPIRED, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED, onExpired);
  }, [applyUser]);

  // Coming back to the tab re-reads the account, so a session that ended while
  // the tab sat in the background is noticed at once and profile changes show.
  useEffect(() => {
    const recheck = () => {
      if (!userRef.current || document.visibilityState !== 'visible') return;
      if (Date.now() - lastCheck.current < RECHECK_MS) return;
      lastCheck.current = Date.now();
      // A 401 here fires SESSION_EXPIRED; a network error returns null and
      // keeps the student signed in.
      authService.getCurrentUser().then((fresh) => {
        if (fresh && userRef.current) applyUser(fresh);
      });
    };
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', recheck);
    return () => {
      window.removeEventListener('focus', recheck);
      document.removeEventListener('visibilitychange', recheck);
    };
  }, [applyUser]);

  const login = useCallback((userData: User) => {
    applyUser(userData);
  }, [applyUser]);

  // Ends the session on the server too. This used to clear only the screen
  // state: the token in localStorage and the refresh cookie survived, so the
  // next reload signed the student straight back in.
  const logout = useCallback(async () => {
    applyUser(null);
    await authService.logout().catch(() => undefined);
  }, [applyUser]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
