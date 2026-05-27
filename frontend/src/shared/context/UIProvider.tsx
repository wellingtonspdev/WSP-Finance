import { useState } from 'react';
import type { ReactNode } from 'react';
import { UIContext } from './UIContext';

export function UIProvider({ children }: { children: ReactNode }) {
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        const stored = localStorage.getItem('wsp_sidebar_collapsed');
        return stored === 'true';
    });

    const openTransactionModal = () => setIsTransactionModalOpen(true);
    const closeTransactionModal = () => setIsTransactionModalOpen(false);

    const openMobileMenu = () => setIsMobileMenuOpen(true);
    const closeMobileMenu = () => setIsMobileMenuOpen(false);
    const toggleMobileMenu = () => setIsMobileMenuOpen(prev => !prev);

    const toggleSidebar = () => {
        setIsSidebarCollapsed(prev => {
            const newState = !prev;
            localStorage.setItem('wsp_sidebar_collapsed', String(newState));
            return newState;
        });
    };

    return (
        <UIContext.Provider value={{
            isTransactionModalOpen,
            openTransactionModal,
            closeTransactionModal,
            isMobileMenuOpen,
            openMobileMenu,
            closeMobileMenu,
            toggleMobileMenu,
            isSidebarCollapsed,
            toggleSidebar
        }}>
            {children}
        </UIContext.Provider>
    );
}
