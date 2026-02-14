import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, Link } from 'react-router-dom';
import { useResetPassword } from '../hooks/usePasswordRecovery';
import { resetPasswordSchema } from '../types';
import type { ResetPasswordDTO } from '../types'; // Mantendo apenas o tipo aqui, removendo da linha anterior se houvesse
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { useState } from 'react';
import { KeyRound, Hash, CheckCircle } from 'lucide-react';

export function ResetPasswordForm() {
  const location = useLocation();
  const email = location.state?.email;

  const { mutate: resetPassword, isPending } = useResetPassword();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordDTO>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = (data: ResetPasswordDTO) => {
    if (!email) {
      setServerError('E-mail não identificado. Reinicie o processo.');
      return;
    }
    setServerError(null);
    resetPassword({
      email,
      code: data.code,
      newPassword: data.newPassword
    }, {
      onError: (error) => {
        setServerError(error.response?.data?.message || 'Erro ao redefinir senha');
      },
    });
  };

  if (!email) {
    return (
      <div className="text-center space-y-4">
        <p className="text-red-300 bg-red-900/30 p-3 rounded-lg border border-red-500/20">E-mail não identificado.</p>
        <Link to="/forgot-password" className="text-white hover:text-[#D946EF] underline">Reiniciar Recuperação</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-6">
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-3xl font-bold text-white tracking-tight">Redefinir Senha</h1>
        <p className="text-slate-400 text-sm">
          Insira o código enviado para <strong className="text-white">{email}</strong>
        </p>
      </div>

      {serverError && (
        <div className="p-3 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
          {serverError}
        </div>
      )}

      <div className="space-y-4">
        <Input
          placeholder="Código (6 dígitos)"
          maxLength={6}
          error={errors.code?.message}
          {...register('code')}
          icon={<Hash className="w-5 h-5" />}
        />

        <Input
          type="password"
          placeholder="Nova Senha"
          error={errors.newPassword?.message}
          {...register('newPassword')}
          icon={<KeyRound className="w-5 h-5" />}
        />

        <Input
          type="password"
          placeholder="Confirmar Nova Senha"
          error={errors.confirmNewPassword?.message}
          {...register('confirmNewPassword')}
          icon={<CheckCircle className="w-5 h-5" />}
        />
      </div>

      <Button type="submit" isLoading={isPending}>
        Alterar Senha
      </Button>
    </form>
  );
}