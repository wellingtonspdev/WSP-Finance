import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';

interface PageTransitionProps {
    children: ReactNode;
    /** Unique key for AnimatePresence (use location.pathname) */
    routeKey?: string;
}

const pageVariants = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
};

const pageTransition = {
    duration: 0.25,
    ease: 'easeOut' as const,
};

/**
 * Wrapper para transições de página suaves.
 * Uso: <PageTransition routeKey={location.pathname}>{children}</PageTransition>
 */
export function PageTransition({ children, routeKey }: PageTransitionProps) {
    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={routeKey}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={pageVariants}
                transition={pageTransition}
                className="w-full"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}
