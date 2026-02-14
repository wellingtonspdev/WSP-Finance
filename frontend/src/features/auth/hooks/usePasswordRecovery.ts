import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../shared/lib/axios';
import { AxiosError } from 'axios';
import { useToast } from '../../../shared/hooks/useToast';

interface ResetPasswordDTO {
  email: string;
  code: string;
  newPassword: string;
}

const forgotFn = async (email: string) => {
  await api.post('/password/forgot', { email });
};

const resetFn = async (data: ResetPasswordDTO) => {
  await api.post('/password/reset', data);
};

export function useForgotPassword() {
  const navigate = useNavigate();
  const toast = useToast();

  return useMutation({
    mutationFn: forgotFn,
    onSuccess: (_, email) => {
      toast.success('Código enviado! Verifique seu e-mail.');
      navigate('/reset-password', { state: { email } });
    },
    onError: (error: AxiosError<{ message: string }>) => {
      console.error('Forgot password failed:', error.response?.data?.message);
    }
  });
}

export function useResetPassword() {
  const navigate = useNavigate();
  const toast = useToast();

  return useMutation({
    mutationFn: resetFn,
    onSuccess: () => {
      toast.success('Senha alterada com sucesso! Faça login.');
      navigate('/login');
    },
    onError: (error: AxiosError<{ message: string }>) => {
      console.error('Reset password failed:', error.response?.data?.message);
    }
  });
}