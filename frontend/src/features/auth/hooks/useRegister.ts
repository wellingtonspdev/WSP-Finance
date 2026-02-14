import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../shared/lib/axios';
import type { RegisterDTO } from '../types'; // MUDANÇA: import type
import { AxiosError } from 'axios';

const registerFn = async (data: RegisterDTO) => {
  const response = await api.post('/auth/register', data);
  return response.data;
};

export function useRegister() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: registerFn,
    onSuccess: (_, variables) => {
      // Redireciona para OTP levando o e-mail para preencher automaticamente
      navigate('/verify', { state: { email: variables.email } });
    },
    onError: (error: AxiosError<{ message: string }>) => {
      console.error('Register failed:', error.response?.data?.message);
    }
  });
}