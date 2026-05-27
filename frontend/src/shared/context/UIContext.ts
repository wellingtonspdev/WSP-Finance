import { createContext } from 'react';

export interface UIContextType {
    isTransactionModalOpen: boolean;
    openTransactionModal: () => void;
    closeTransactionModal: () => void;
    isMobileMenuOpen: boolean;
    openMobileMenu: () => void;
    closeMobileMenu: () => void;
    toggleMobileMenu: () => void;
    isSidebarCollapsed: boolean;
    toggleSidebar: () => void;
}

export const UIContext = createContext<UIContextType | undefined>(undefined);
