import { ReactNode } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-[#11051f] text-white font-sans antialiased overflow-hidden relative">
      {/* Background Effects (Aurora) - Fixo no fundo */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-20%] w-[140%] h-[60%] bg-gradient-to-b from-[#4c1d95] via-[#2e1065] to-transparent rounded-full blur-[100px] opacity-60 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[50%] bg-gradient-to-t from-[#1e3a8a] to-transparent rounded-full blur-[80px] opacity-40"></div>
      </div>

      {/* Desktop Sidebar (Hidden on Mobile) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative z-10 w-full overflow-hidden">
        {/* Container Responsivo */}
        <div className="flex-1 flex flex-col w-full lg:max-w-7xl lg:mx-auto h-full">
          <Header />
          
          {/* Scrollable Area */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden px-0 lg:px-8 pb-32 lg:pb-8 scroll-smooth">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Nav (Hidden on Desktop) */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}