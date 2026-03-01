import { z } from 'zod';

// --- LOGIN ---
export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export type LoginDTO = z.infer<typeof loginSchema>;

// --- REGISTER ---
export const registerSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export type RegisterDTO = z.infer<typeof registerSchema>;

// --- VERIFY ---
export const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, 'O código deve ter 6 dígitos'),
});

export type VerifyDTO = z.infer<typeof verifySchema>;

// --- FORGOT PASSWORD ---
export const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
});

export type ForgotPasswordDTO = z.infer<typeof forgotPasswordSchema>;

// --- RESET PASSWORD ---
export const resetPasswordSchema = z.object({
  code: z.string().length(6, 'O código deve ter 6 dígitos'),
  newPassword: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres'),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "As senhas não coincidem",
  path: ["confirmNewPassword"],
});

export type ResetPasswordDTO = z.infer<typeof resetPasswordSchema>;

// --- API RESPONSES ---
export interface AuthResponse {
  user: {
    id: number;
    name: string;
    email: string;
    memberships: {
      id: number;
      name: string;
      type: 'PERSONAL' | 'BUSINESS';
      role: 'OWNER' | 'VIEWER';
    }[];
  };
  token: string;
  refreshToken: string;
}