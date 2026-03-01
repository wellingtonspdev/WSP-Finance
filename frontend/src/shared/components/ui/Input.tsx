import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  rightElement?: ReactNode;
  error?: string;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon, rightElement, error, label, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">
            {label}
          </label>
        )}
        <div className="relative group">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-[#D946EF] transition-colors">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            className={clsx(
              'w-full py-4 rounded-2xl text-white font-medium placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D946EF]/50 focus:border-transparent transition-all shadow-inner',
              icon ? 'pl-12' : 'pl-4',
              rightElement ? 'pr-12' : 'pr-4',
              error ? 'border border-red-500/50 bg-red-500/5' : 'border border-white/5 bg-[#11051f]/50',
              className
            )}
            {...props}
          />

          {rightElement && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <div className="flex items-center mt-1.5 ml-1 animate-fadeIn">
            <span className="text-xs font-medium text-red-400">
              {error}
            </span>
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';