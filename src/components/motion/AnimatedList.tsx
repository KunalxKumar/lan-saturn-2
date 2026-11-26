import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

interface AnimatedListProps<T> {
    items: T[];
    getKey: (item: T) => string;
    renderItem: (item: T) => React.ReactNode;
    className?: string;
}

export default function AnimatedList<T>({
    items,
    getKey,
    renderItem,
    className = '',
}: AnimatedListProps<T>) {
    const prefersReduced = useReducedMotion();

    return (
        <div className={className}>
            <AnimatePresence initial={false}>
                {items.map((item) => (
                    <motion.div
                        key={getKey(item)}
                        initial={prefersReduced ? false : { opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={prefersReduced ? undefined : { opacity: 0 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    >
                        {renderItem(item)}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
