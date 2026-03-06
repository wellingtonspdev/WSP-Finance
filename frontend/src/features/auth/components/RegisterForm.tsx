import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useRegister } from '../hooks/useRegister';
import { registerSchema } from '../types';
import type { RegisterDTO } from '../types';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { useState } from 'react';
import { User, Mail, Lock, CheckCircle, Store, Briefcase } from 'lucide-react';
import { clsx } from 'clsx';

export function RegisterForm() {
  const { mutate: registerUser, isPending } = useRegister();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterDTO>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      type: 'CLIENT'
    }
  });

  const selectedType = watch('type');

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

      {/* Cards de Persona */}
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setValue('type', 'CLIENT')}
          className={clsx(
            "p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2",
            selectedType === 'CLIENT'
              ? "bg-[#D946EF]/10 border-[#D946EF] text-white"
              : "bg-white/5 border-transparent text-slate-400 hover:bg-white/10"
          )}
        >
          <Store className={clsx("w-8 h-8", selectedType === 'CLIENT' ? "text-[#D946EF]" : "")} />
          <span className="font-semibold text-sm">Empreendedor</span>
          <span className="text-xs text-center opacity-70">Gerenciar meu negócio</span>
        </button>

        <button
          type="button"
          onClick={() => setValue('type', 'ACCOUNTANT')}
          className={clsx(
            "p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2",
            selectedType === 'ACCOUNTANT'
              ? "bg-blue-500/10 border-blue-500 text-white"
              : "bg-white/5 border-transparent text-slate-400 hover:bg-white/10"
          )}
        >
          <Briefcase className={clsx("w-8 h-8", selectedType === 'ACCOUNTANT' ? "text-blue-500" : "")} />
          <span className="font-semibold text-sm">Contador</span>
          <span className="text-xs text-center opacity-70">Auditar clientes</span>
        </button>
      </div>

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