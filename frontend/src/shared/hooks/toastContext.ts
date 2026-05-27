import { createContext } from 'react';
import type { ToastType } from '../components/ui/Toast';

export interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

export const ToastContext = createContext<ToastContextType | null>(null);
