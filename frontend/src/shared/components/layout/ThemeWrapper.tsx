import { useEffect } from 'react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { useAuth } from '../../../app/AuthProvider';

interface ThemeWrapperProps {
    children: React.ReactNode;
}

export function ThemeWrapper({ children }: ThemeWrapperProps) {
    const { activeMembership } = useWorkspaceStore();
    const { user } = useAuth();

    useEffect(() => {
        // Regra de Ouro: Contador SEMPRE vê tema business.
        // Adicionando transição de cores suave no body para evitar flashes
        document.body.classList.add('transition-colors', 'duration-500', 'ease-in-out');

        const isAccountant = user?.type === 'ACCOUNTANT';
        const isBusiness = activeMembership?.type === 'BUSINESS';

        if (isAccountant || isBusiness) {
            document.body.classList.add('theme-business');
        } else {
            document.body.classList.remove('theme-business');
        }

        // Cleanup caso desmonte
        return () => {
            document.body.classList.remove('theme-business');
            document.body.classList.remove('transition-colors', 'duration-500', 'ease-in-out');
        };
    }, [activeMembership?.type, user?.type]);

    return <>{children}</>;
}
