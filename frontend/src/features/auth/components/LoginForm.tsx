import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useLogin } from '../hooks/useLogin';
import { loginSchema } from '../types';
import type { LoginDTO } from '../types';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'; // Usando Lucide para consistência

export function LoginForm() {
  const navigate = useNavigate();
  const { mutate: login, isPending } = useLogin();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginDTO>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginDTO) => {
    setServerError(null);
    login(data, {
      onError: (error) => {
        const message = error.response?.data?.message || 'Erro ao realizar login';
        if (message.includes('not verified') || error.response?.status === 403) {
          navigate('/verify', { state: { email: data.email } });
          return;
        }
        setServerError(message);
      },
    });
  };

  return (
    <motion.form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full space-y-6"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Bem-vindo</h1>
        <p className="text-slate-400 text-sm">Insira suas credenciais para acessar</p>
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

        <div className="space-y-2">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Senha"
            error={errors.password?.message}
            {...register('password')}
            icon={<Lock className="w-5 h-5" />}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-500 hover:text-white focus:outline-none transition-colors p-1"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            }
          />
          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-slate-400 hover:text-[#D946EF] transition-colors"
            >
              Esqueceu a senha?
            </Link>
          </div>
        </div>
      </div>

      <Button type="submit" isLoading={isPending}>
        Entrar
      </Button>

      <footer className="flex flex-col items-center space-y-4 pt-4 border-t border-white/5">
        <p className="text-sm text-slate-400">
          Não tem uma conta?{' '}
          <Link to="/register" className="font-semibold text-white hover:text-[#D946EF] transition-colors">
            Cadastre-se
          </Link>
        </p>
      </footer>
    </motion.form>
  );
}