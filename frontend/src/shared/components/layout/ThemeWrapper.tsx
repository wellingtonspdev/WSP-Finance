import { useEffect } from 'react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';

interface ThemeWrapperProps {
    children: React.ReactNode;
}

export function ThemeWrapper({ children }: ThemeWrapperProps) {
    const { activeMembership } = useWorkspaceStore();

    useEffect(() => {
        const isBusiness = activeMembership?.type === 'BUSINESS';

        if (isBusiness) {
            document.body.classList.add('theme-business');
        } else {
            document.body.classList.remove('theme-business');
        }

        // Cleanup caso desmonte
        return () => document.body.classList.remove('theme-business');
    }, [activeMembership?.type]);

    return <>{children}</>;
}
