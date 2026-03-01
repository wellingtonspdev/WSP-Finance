import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface UIContextType {
    isTransactionModalOpen: boolean;
    openTransactionModal: () => void;
    closeTransactionModal: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

    const openTransactionModal = () => setIsTransactionModalOpen(true);
    const closeTransactionModal = () => setIsTransactionModalOpen(false);

    return (
        <UIContext.Provider value={{
            isTransactionModalOpen,
            openTransactionModal,
            closeTransactionModal
        }}>
            {children}
        </UIContext.Provider>
    );
}

export function useUI() {
    const context = useContext(UIContext);
    if (context === undefined) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
}
