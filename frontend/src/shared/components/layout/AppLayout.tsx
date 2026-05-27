import { useState, Suspense, lazy, type ReactNode } from 'react';
import { useAuth } from '../../../app/AuthProvider';
import { AccountantBottomNav } from '../../../features/accountant/components/AccountantBottomNav';
import { AccountantSidebar } from '../../../features/accountant/components/AccountantSidebar';
import { useUI } from '../../context/useUI';
import { useCapabilities } from '../../hooks/useCapabilities';
import { AuditBanner } from './AuditBanner';
import { BottomNav } from './BottomNav';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

const TransactionModal = lazy(() =>
  import('../../../features/transactions/components/TransactionModal').then((module) => ({
    default: module.TransactionModal,
  }))
);

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isTransactionModalOpen, closeTransactionModal, toggleMobileMenu, isSidebarCollapsed, toggleSidebar } = useUI();
  const { canViewAuditBanner } = useCapabilities();
  const { user } = useAuth();

  const [isAccountantSidebarCollapsed, setIsAccountantSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem('wsp_accountant_sidebar_collapsed');
    return stored === 'true';
  });

  const toggleAccountantSidebar = () => {
    setIsAccountantSidebarCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('wsp_accountant_sidebar_collapsed', String(newState));
      return newState;
    });
  };

  const isAccountantPersona =
    user?.type === 'ACCOUNTANT' || user?.memberships?.some((membership) => membership.role === 'ACCOUNTANT');

  return (
    <div
      className={`flex h-screen text-white font-sans antialiased overflow-hidden relative transition-colors duration-500 ease-in-out ${
        isAccountantPersona ? 'bg-[#0f172a]' : 'bg-[#11051f]'
      }`}
    >
      <div className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-700 ease-in-out">
        {isAccountantPersona ? (
          <div className="absolute top-[-20%] right-[-10%] w-[120%] h-[70%] bg-gradient-to-bl from-[#0f172a] via-[#1e1b4b] to-[#0f172a] rounded-full blur-[120px] opacity-70 pointer-events-none transition-all duration-700" />
        ) : (
          <>
            <div className="absolute top-[-10%] left-[-20%] w-[140%] h-[60%] bg-gradient-to-b from-[#4c1d95] via-[#2e1065] to-transparent rounded-full blur-[100px] opacity-60 animate-pulse transition-all duration-700" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[50%] bg-gradient-to-t from-[#1e3a8a] to-transparent rounded-full blur-[80px] opacity-40 transition-all duration-700" />
          </>
        )}
      </div>

      {isAccountantPersona ? (
        <AccountantSidebar
          isCollapsed={isAccountantSidebarCollapsed}
          onToggle={toggleAccountantSidebar}
        />
      ) : (
        <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      )}

      <div className="flex-1 flex flex-col h-full relative z-10 w-full overflow-hidden">
        {canViewAuditBanner && <AuditBanner />}

        <div className="flex-1 flex flex-col w-full h-full">
          {!isAccountantPersona ? (
            <Header />
          ) : (
            <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-800/50 bg-[#0f172a]/90 backdrop-blur-md">
              <button
                onClick={toggleMobileMenu}
                className="p-2 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <div className="w-5 h-0.5 bg-slate-400 mb-1" />
                <div className="w-5 h-0.5 bg-slate-400 mb-1" />
                <div className="w-5 h-0.5 bg-slate-400" />
              </button>
              <span className="font-semibold text-lg text-slate-200">WSP Finance</span>
              <div className="w-9" />
            </div>
          )}

          <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 lg:px-8 pb-32 lg:pb-8 scroll-smooth w-full">
            {children}
          </main>
        </div>
      </div>

      <div className="lg:hidden">
        {isAccountantPersona ? <AccountantBottomNav /> : <BottomNav />}
      </div>

      {isTransactionModalOpen && (
        <Suspense fallback={null}>
          <TransactionModal
            isOpen={isTransactionModalOpen}
            onClose={closeTransactionModal}
          />
        </Suspense>
      )}
    </div>
  );
}
