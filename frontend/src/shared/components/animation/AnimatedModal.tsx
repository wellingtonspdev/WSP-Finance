import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';

interface AnimatedModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    /** Extra class for the modal container */
    className?: string;
}

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
};

const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.2, ease: 'easeOut' as const },
    },
    exit: {
        opacity: 0,
        scale: 0.97,
        y: 6,
        transition: { duration: 0.15, ease: 'easeIn' as const },
    },
};

/**
 * Wrapper para modais com animação de entrada/saída suave.
 * Substitui o padrão {isOpen && <div>} por AnimatePresence.
 */
export function AnimatedModal({ isOpen, onClose, children, className }: AnimatedModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Overlay escuro com fade */}
                    <motion.div
                        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
                        variants={overlayVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                    />

                    {/* Container do Modal com scale + fade */}
                    <motion.div
                        className={`fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none ${className || ''}`}
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        <div className="pointer-events-auto w-full" onClick={(e) => e.stopPropagation()}>
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
