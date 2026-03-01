import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
}

export function Button({
  children,
  className,
  isLoading,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <div className="pt-2 w-full">
      <button
        className={clsx(
          'w-full py-4 rounded-2xl bg-gradient-to-r from-[#D946EF] to-[#3B82F6] text-white font-bold text-lg shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center',
          (isLoading || disabled) && 'opacity-70 cursor-not-allowed grayscale',
          className
        )}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : children}
      </button>
    </div>
  );
}