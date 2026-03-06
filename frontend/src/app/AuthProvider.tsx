import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api, setApiToken } from '../shared/lib/axios';

interface Membership {
  id: number;
  name: string;
  type: 'PERSONAL' | 'BUSINESS';
  role: 'OWNER' | 'VIEWER';
}

export interface User {
  id: number;
  name: string;
  email: string;
  type: 'CLIENT' | 'ACCOUNTANT';
  memberships: Membership[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, refreshToken: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedRefreshToken = localStorage.getItem('wsp_refresh_token');
        if (!storedRefreshToken) throw new Error('No refresh token found');

        // Envia o refresh token validamente no payload conforme esperado pelo Backend (Zod)
        const { data } = await api.patch('/auth/refresh', { refreshToken: storedRefreshToken });

        // Backend retorna { token, refreshToken } (Não retorna dados de User)
        setApiToken(data.token);
        localStorage.setItem('wsp_refresh_token', data.refreshToken);

        // Solução Provisória Segura: Ler do storage APENAS os dados não sensíveis do usuário
        const storedUser = localStorage.getItem('wsp_user_info');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        setApiToken(null);
        setUser(null);
        localStorage.removeItem('wsp_refresh_token');
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = (token: string, refreshToken: string, userData: User) => {
    // Salva access token na memória e salva refresh na persistência local
    setApiToken(token);
    localStorage.setItem('wsp_refresh_token', refreshToken);

    // Salva dados do usuário para persistência de UI
    localStorage.setItem('wsp_user_info', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    setApiToken(null);
    localStorage.removeItem('wsp_user_info');
    localStorage.removeItem('wsp_refresh_token');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);