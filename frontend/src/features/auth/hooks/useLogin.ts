import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../shared/lib/axios';
import { useAuth } from '../../../app/AuthProvider';
import type { LoginDTO, AuthResponse } from '../types'; // MUDANÇA: import type
import { AxiosError } from 'axios';

const loginFn = async (data: LoginDTO): Promise<AuthResponse> => {
  const response = await api.post('/auth/session', data);
  return response.data;
};

export function useLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();

  return useMutation({
    mutationFn: loginFn,
    onSuccess: (data) => {
      login(data.token, data.user);
      navigate('/');
    },
    onError: (error: AxiosError<{ message: string }>) => {
      console.error('Login failed:', error.response?.data?.message);
    }
  });
}