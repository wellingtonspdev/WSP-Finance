import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useForgotPassword } from '../hooks/usePasswordRecovery';
import { forgotPasswordSchema } from '../types';
import type { ForgotPasswordDTO } from '../types'; // Mantendo apenas o tipo aqui, removendo da linha anterior se houvesse
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { useState } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';

export function ForgotPasswordForm() {
  const { mutate: forgotPassword, isPending } = useForgotPassword();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordDTO>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = (data: ForgotPasswordDTO) => {
    setServerError(null);
    forgotPassword(data.email, {
      onError: (error) => {
        setServerError(error.response?.data?.message || 'Erro ao solicitar recuperação');
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-6">
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-3xl font-bold text-white tracking-tight">Recuperar Senha</h1>
        <p className="text-slate-400 text-sm">Digite seu e-mail para receber o código</p>
      </div>

      {serverError && (
        <div className="p-3 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
          {serverError}
        </div>
      )}

      <div className="space-y-4">
        <Input
          type="email"
          placeholder="E-mail"
          error={errors.email?.message}
          {...register('email')}
          icon={<Mail className="w-5 h-5" />}
        />
      </div>

      <Button type="submit" isLoading={isPending}>
        Enviar Código
      </Button>

      <div className="text-center mt-4 pt-4 border-t border-white/5">
        <Link to="/login" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar para Login
        </Link>
      </div>
    </form>
  );
}