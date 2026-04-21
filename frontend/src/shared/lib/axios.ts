import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '../../config/env';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';

// Estado local do Token (MemÃ³ria apenas)
let accessToken: string | null = null;

// Controle de ConcorrÃªncia (Fila de Espera)
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

// FunÃ§Ã£o para processar a fila
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

export const api = axios.create({
  baseURL: env.API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Envia Cookies (RefreshToken)
});

// FunÃ§Ã£o para definir o token (usada pelo AuthProvider no Login)
export const setApiToken = (token: string | null) => {
  accessToken = token;
};

// Interceptor de Request: Injeta o Token da MemÃ³ria e o WorkspaceID da URL
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  // Fonte Ãšnica da Verdade (V3): URL Ã© a ÃšNICA fonte de workspace ID para rotas normais.
  // Exemplo de pathname: "/15/dashboard" -> ID = 15
  // Em rotas como "/accountant/*", o WID pode ser injetado manualmente nas API calls.
  const pathParts = window.location.pathname.split('/');
  let possibleWorkspaceId = pathParts[1];

  // Suporte para a rota do Inbox do Contador: /accountant/inbox/15
  // Isso permite que chamadas genÃ©ricas na tela (como getCategories) funcionem magicamente.
  if (pathParts[1] === 'accountant' && pathParts[2] === 'inbox' && pathParts[3]) {
    possibleWorkspaceId = pathParts[3];
  }

  // A URL precisa prevalecer sobre qualquer header stale herdado de estado global anterior.
  if (possibleWorkspaceId && !isNaN(parseInt(possibleWorkspaceId, 10))) {
    config.headers['x-workspace-id'] = possibleWorkspaceId;
  } else if (!config.headers['x-workspace-id']) {
    // Remover para garantir que nenhuma requisiÃ§Ã£o nÃ£o declarada leve lixo residual.
    delete config.headers['x-workspace-id'];
  }

  return config;
});

// Interceptor de Response: Refresh Token com Fila
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Disparo Global de Acesso Negado
    if (error.response?.status === 403) {
      useWorkspaceStore.getState().setForbidden(true);
    }

    // Evita interceptaÃ§Ã£o se for na prÃ³pria rota de login ou refresh
    if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/session')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Se jÃ¡ houver um refresh em andamento, entra na fila
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise((resolve, reject) => {
        const storedRefreshToken = localStorage.getItem('wsp_refresh_token');
        if (!storedRefreshToken) {
          processQueue(error, null);
          setApiToken(null);
          window.location.href = '/login';
          return reject(error);
        }

        // Chama a rota de refresh passando o payload Zod corretamente
        api.patch<{ token: string, refreshToken: string }>('/auth/refresh', { refreshToken: storedRefreshToken })
          .then(({ data }) => {
            const newToken = data.token;

            // Atualiza a memÃ³ria local do Axios e a persistÃªncia
            setApiToken(newToken);
            localStorage.setItem('wsp_refresh_token', data.refreshToken);

            // Atualiza o header da requisiÃ§Ã£o original
            originalRequest.headers.Authorization = `Bearer ${newToken}`;

            // Libera a fila com o novo token
            processQueue(null, newToken);

            // Reenvia a requisiÃ§Ã£o original
            resolve(api(originalRequest));
          })
          .catch((err) => {
            // Se falhar (Refresh expirado), rejeita a fila e limpa tudo
            processQueue(err, null);
            setApiToken(null);
            // O AuthProvider deve ouvir esse evento ou checar o estado para redirecionar
            // Como estamos fora do React, podemos disparar um evento customizado ou redirecionar direto
            window.location.href = '/login';
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    return Promise.reject(error);
  }
);
