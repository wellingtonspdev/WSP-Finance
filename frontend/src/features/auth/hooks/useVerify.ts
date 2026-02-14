import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../shared/lib/axios';
import type { VerifyDTO } from '../types';
import { AxiosError } from 'axios';
import { useToast } from '../../../shared/hooks/useToast';

const verifyFn = async (data: VerifyDTO) => {
  const response = await api.post('/auth/verify', data);
  return response.data;
};

const resendFn = async (email: string) => {
  const response = await api.post('/auth/resend-verification', { email });
  return response.data;
};

export function useVerify() {
  const navigate = useNavigate();
  const toast = useToast();

  return useMutation({
    mutationFn: verifyFn,
    onSuccess: () => {
      toast.success('Conta verificada com sucesso! Faça login.');
      navigate('/login');
    },
    onError: (error: AxiosError<{ message: string }>) => {
      console.error('Verification failed:', error.response?.data?.message);
    }
  });
}

export function useResendCode() {
  const toast = useToast();

  return useMutation({
    mutationFn: resendFn,
    onSuccess: () => {
      toast.success('Novo código enviado para seu e-mail.');
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || 'Erro ao reenviar código');
    }
  });
}