import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '../../config/env';

// Estado local do Token (Memória apenas)
let accessToken: string | null = null;

// Controle de Concorrência (Fila de Espera)
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

// Função para processar a fila
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

// Função para definir o token (usada pelo AuthProvider no Login)
export const setApiToken = (token: string | null) => {
  accessToken = token;
};

// Interceptor de Request: Injeta o Token da Memória
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  // Injeta o Workspace ID (Este pode ficar no localStorage pois é preferência de UI, não credencial)
  const workspaceId = localStorage.getItem('wsp_workspace_id');
  if (workspaceId) {
    config.headers['x-workspace-id'] = workspaceId;
  }

  return config;
});

// Interceptor de Response: Refresh Token com Fila
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Evita interceptação se for na própria rota de login ou refresh
    if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/session')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Se já houver um refresh em andamento, entra na fila
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

            // Atualiza a memória local do Axios e a persistência
            setApiToken(newToken);
            localStorage.setItem('wsp_refresh_token', data.refreshToken);

            // Atualiza o header da requisição original
            originalRequest.headers.Authorization = `Bearer ${newToken}`;

            // Libera a fila com o novo token
            processQueue(null, newToken);

            // Reenvia a requisição original
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