import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser, DashboardCacheEntry } from '../features/auth/types';
import { api, setApiToken } from '../shared/lib/axios';
import { useWorkspaceStore } from '../shared/stores/useWorkspaceStore';

export type User = AuthUser;

type RestoredSession = {
  token: string;
  refreshToken: string;
  meData: User & { dashboardCache?: DashboardCacheEntry[] | null };
};

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  dashboardCache: DashboardCacheEntry[] | null;
  login: (token: string, refreshToken: string, user: User, cache?: DashboardCacheEntry[]) => void;
  refreshDashboardCache: () => Promise<DashboardCacheEntry[]>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

let restoreSessionInFlight: Promise<RestoredSession | null> | null = null;

async function restoreSessionSnapshot(): Promise<RestoredSession | null> {
  const storedRefreshToken = localStorage.getItem('wsp_refresh_token');

  if (!storedRefreshToken) {
    return null;
  }

  if (!restoreSessionInFlight) {
    restoreSessionInFlight = (async () => {
      const { data } = await api.patch('/auth/refresh', { refreshToken: storedRefreshToken });
      setApiToken(data.token);

      const { data: meData } = await api.get('/auth/me');

      return {
        token: data.token,
        refreshToken: data.refreshToken,
        meData,
      };
    })().finally(() => {
      restoreSessionInFlight = null;
    });
  }

  return restoreSessionInFlight;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dashboardCache, setDashboardCache] = useState<DashboardCacheEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const setMemberships = useWorkspaceStore((state) => state.setMemberships);

  const persistDashboardCache = (cache?: DashboardCacheEntry[] | null) => {
    if (cache) {
      localStorage.setItem('wsp_dashboard_cache', JSON.stringify(cache));
      setDashboardCache(cache);
      return;
    }

    localStorage.removeItem('wsp_dashboard_cache');
    setDashboardCache(null);
  };

  useEffect(() => {
    setMemberships(user?.memberships ?? []);
  }, [user, setMemberships]);

  useEffect(() => {
    let isCancelled = false;

    const restoreSession = async () => {
      try {
        const restoredSession = await restoreSessionSnapshot();
        if (isCancelled) return;

        if (!restoredSession) {
          throw new Error('No refresh token found');
        }

        localStorage.setItem('wsp_refresh_token', restoredSession.refreshToken);
        localStorage.setItem('wsp_user_info', JSON.stringify(restoredSession.meData));

        setUser(restoredSession.meData);
        persistDashboardCache(restoredSession.meData.dashboardCache ?? null);
      } catch (error) {
        if (isCancelled) return;

        setApiToken(null);
        setUser(null);
        persistDashboardCache(null);
        localStorage.removeItem('wsp_user_info');
        localStorage.removeItem('wsp_refresh_token');
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isCancelled = true;
    };
  }, []);

  const login = (token: string, refreshToken: string, userData: User, cache?: DashboardCacheEntry[]) => {
    setApiToken(token);
    localStorage.setItem('wsp_refresh_token', refreshToken);
    localStorage.setItem('wsp_user_info', JSON.stringify(userData));
    setUser(userData);

    persistDashboardCache(cache ?? null);
  };

  const refreshDashboardCache = async () => {
    const { data } = await api.post<{ dashboardCache?: DashboardCacheEntry[] }>('/accountant/cache/refresh');
    const nextCache = data.dashboardCache ?? [];

    persistDashboardCache(nextCache);
    return nextCache;
  };

  const logout = () => {
    setApiToken(null);
    localStorage.removeItem('wsp_user_info');
    localStorage.removeItem('wsp_refresh_token');
    localStorage.removeItem('wsp_dashboard_cache');
    setUser(null);
    setDashboardCache(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, dashboardCache, login, refreshDashboardCache, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
