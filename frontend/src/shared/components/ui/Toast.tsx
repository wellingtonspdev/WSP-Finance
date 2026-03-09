import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Erros ficam mais tempo na tela para o usuário ler
  const autoCloseMs = duration ?? (type === 'error' ? 8000 : 3000);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, autoCloseMs);

    return () => clearTimeout(timer);
  }, [onClose, autoCloseMs]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const styles = {
    success: 'bg-green-500/90 border-green-400 text-white',
    error: 'bg-red-500/90 border-red-400 text-white',
    info: 'bg-blue-500/90 border-blue-400 text-white',
  };

  const icons = {
    success: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div
      className={clsx(
        'fixed top-4 right-4 z-[9999] flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-300 transform max-w-md',
        styles[type],
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
      )}
    >
      {icons[type]}
      <span className="font-medium text-sm leading-relaxed flex-1">{message}</span>
      <button
        onClick={handleClose}
        className="p-0.5 rounded-full hover:bg-white/20 transition-colors shrink-0 ml-2"
        aria-label="Fechar notificação"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}