import { useLocation, Link } from 'react-router-dom';
import { useVerify, useResendCode } from '../hooks/useVerify';
import { OTPInput } from './OTPInput';
import { Button } from '../../../shared/components/ui/Button';
import { useState, useEffect } from 'react';
import { MailCheck } from 'lucide-react';

export function VerifyForm() {
  const location = useLocation();
  const email = location.state?.email;
  
  const { mutate: verify, isPending } = useVerify();
  const { mutate: resend, isPending: isResending } = useResendCode();
  
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(30);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleComplete = (code: string) => {
    if (!email) {
      setError('E-mail não encontrado. Volte para o login.');
      return;
    }
    setError(null);
    verify({ email, code }, {
      onError: (err) => setError(err.response?.data?.message || 'Código inválido'),
    });
  };

  const handleResend = () => {
    if (!email) return;
    resend(email);
    setTimer(30);
  };

  if (!email) {
    return (
      <div className="text-center space-y-4">
        <p className="text-red-300 bg-red-900/30 p-3 rounded-lg">E-mail não identificado.</p>
        <Link to="/login" className="text-white hover:text-[#D946EF] underline">Voltar para Login</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-md text-center">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-[#D946EF]/20 flex items-center justify-center">
          <MailCheck className="w-8 h-8 text-[#D946EF]" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white tracking-tight">Verifique seu e-mail</h1>
        <p className="text-slate-400 text-sm">
          Enviamos um código de 6 dígitos para <br />
          <span className="font-medium text-white">{email}</span>
        </p>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-xl">
          {error}
        </div>
      )}

      <div className="py-2">
        <OTPInput onComplete={handleComplete} />
      </div>

      <Button 
        onClick={() => {}} 
        className="w-full hidden" 
        disabled={isPending}
      >
        Verificar
      </Button>

      <div className="text-sm text-slate-400">
        Não recebeu o código?{' '}
        <button
          onClick={handleResend}
          disabled={timer > 0 || isResending}
          className="font-medium text-white hover:text-[#D946EF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {timer > 0 ? `Reenviar em ${timer}s` : 'Reenviar agora'}
        </button>
      </div>
      
      <div className="pt-4 border-t border-white/5">
        <Link to="/login" className="text-sm text-slate-500 hover:text-white transition-colors">
          ← Voltar para Login
        </Link>
      </div>
    </div>
  );
}