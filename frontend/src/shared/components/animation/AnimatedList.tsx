import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface AnimatedListProps {
    children: ReactNode;
    /** Delay between each child animation (seconds) */
    staggerDelay?: number;
    className?: string;
}

const containerVariants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.06,
        },
    },
};

export const listItemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.3, ease: 'easeOut' as const },
    },
};

/**
 * Wrapper para listas com animação staggered (fade-in sequencial).
 * Cada filho direto deve usar <motion.div variants={listItemVariants}>
 * Ou então wrap each child in <AnimatedListItem>
 */
export function AnimatedList({ children, staggerDelay = 0.06, className }: AnimatedListProps) {
    const variants = {
        ...containerVariants,
        visible: {
            transition: { staggerChildren: staggerDelay },
        },
    };

    return (
        <motion.div
            variants={variants}
            initial="hidden"
            animate="visible"
            className={className}
        >
            {children}
        </motion.div>
    );
}

/**
 * Item wrapper para uso dentro de <AnimatedList>.
 */
export function AnimatedListItem({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <motion.div variants={listItemVariants} className={className}>
            {children}
        </motion.div>
    );
}
