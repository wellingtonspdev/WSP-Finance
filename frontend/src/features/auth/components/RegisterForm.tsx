import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useRegister } from '../hooks/useRegister';
import { registerSchema } from '../types';
import type { RegisterDTO } from '../types';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { useState } from 'react';
import { User, Mail, Lock, CheckCircle } from 'lucide-react';

export function RegisterForm() {
  const { mutate: registerUser, isPending } = useRegister();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterDTO>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterDTO) => {
    setServerError(null);
    registerUser(data, {
      onError: (error) => {
        setServerError(error.response?.data?.message || 'Erro ao criar conta');
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-6">
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-3xl font-bold text-white tracking-tight">Crie sua conta</h1>
        <p className="text-slate-400 text-sm">Comece a gerenciar suas finanças hoje mesmo</p>
      </div>

      {serverError && (
        <div className="p-3 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
          {serverError}
        </div>
      )}

      <div className="space-y-4">
        <Input
          placeholder="Nome Completo"
          error={errors.name?.message}
          {...register('name')}
          icon={<User className="w-5 h-5" />}
        />

        <Input
          type="email"
          placeholder="E-mail"
          error={errors.email?.message}
          {...register('email')}
          icon={<Mail className="w-5 h-5" />}
        />

        <Input
          type="password"
          placeholder="Senha (min. 6 caracteres)"
          error={errors.password?.message}
          {...register('password')}
          icon={<Lock className="w-5 h-5" />}
        />

        <Input
          type="password"
          placeholder="Confirmar Senha"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
          icon={<CheckCircle className="w-5 h-5" />}
        />
      </div>

      <Button type="submit" isLoading={isPending}>
        Criar Conta
      </Button>

      <footer className="flex flex-col items-center space-y-4 pt-4 border-t border-white/5">
        <p className="text-sm text-slate-400">
          Já tem uma conta?{' '}
          <Link to="/login" className="font-semibold text-white hover:text-[#D946EF] transition-colors">
            Faça login
          </Link>
        </p>
      </footer>
    </form>
  );
}