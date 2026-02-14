import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, setApiToken } from '../shared/lib/axios';

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Ao iniciar (F5), tentamos recuperar a sessão via Refresh Token (Cookie)
    const restoreSession = async () => {
      try {
        // Tenta renovar o token silenciosamente
        const { data } = await api.patch('/auth/refresh');
        
        // Se sucesso, define o token na memória do Axios
        setApiToken(data.token);
        
        // Recupera dados do usuário (O ideal seria o refresh retornar o user também, 
        // ou termos uma rota /me. Por enquanto, vamos decodificar ou persistir APENAS o user info no storage)
        // Como o user info não é sensível (nome/email), podemos manter no storage para UX,
        // ou melhor: O backend deveria retornar o user no refresh.
        
        // Solução Provisória Segura: Ler do storage APENAS os dados não sensíveis do usuário
        const storedUser = localStorage.getItem('wsp_user_info');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        // Se falhar, usuário não está logado
        setApiToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = (token: string, userData: User) => {
    // Salva token na memória do Axios
    setApiToken(token);
    
    // Salva dados do usuário (não sensíveis) para persistência de UI
    localStorage.setItem('wsp_user_info', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    setApiToken(null);
    localStorage.removeItem('wsp_user_info');
    setUser(null);
    // Opcional: Chamar rota de logout no backend para limpar cookie
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);