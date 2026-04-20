import type { ReactNode } from 'react';
import logo from '../../../assets/wsp_finance_sem_fundo.png';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden bg-[#11051f]">
      {/* Background Effects (Aurora) - Idêntico ao Dashboard */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-20%] w-[140%] h-[60%] bg-gradient-to-b from-[#4c1d95] via-[#2e1065] to-transparent rounded-full blur-[100px] opacity-60 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[50%] bg-gradient-to-t from-[#1e3a8a] to-transparent rounded-full blur-[80px] opacity-40"></div>
      </div>

      {/* Main Container */}
      <main className="w-full max-w-sm flex flex-col items-center space-y-8 z-10 animate-fade-in-up">
        {/* Logo Section */}
        <header className="flex flex-col items-center justify-center mb-4">
          <div className="flex flex-col items-center justify-center">
            <img
              src={logo}
              alt="WSP Finance Logo"
              className="h-40 w-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500"
            />
          </div>
        </header>

        {/* Content (Form Card) - Estilo Dark Card do Dashboard */}
        <div className="w-full bg-[#1a0b2e]/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl shadow-purple-900/20">
          {children}
        </div>
      </main>
    </div>
  );
}
