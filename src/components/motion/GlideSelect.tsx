import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface GlideOption<T extends string> {
    value: T;
    label: string;
}

interface GlideSelectProps<T extends string> {
    options: GlideOption<T>[];
    value: T;
    onChange: (value: T) => void;
    layoutId?: string;
    className?: string;
}

/**
 * Segmented control with a gliding active indicator (inspired by React Bits glide-select).
 */
export default function GlideSelect<T extends string>({
    options,
    value,
    onChange,
    layoutId = 'glide-select-pill',
    className = '',
}: GlideSelectProps<T>) {
    const prefersReduced = useReducedMotion();

    return (
        <div
            role="tablist"
            className={`inline-flex items-center p-1 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] gap-0.5 ${className}`}
        >
            {options.map((opt) => {
                const active = opt.value === value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(opt.value)}
                        className={`relative px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                            active ? 'text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        {active && (
                            <motion.span
                                layoutId={prefersReduced ? undefined : layoutId}
                                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                                className="absolute inset-0 rounded-md bg-[#222938] border border-[#364154]"
                                aria-hidden="true"
                            />
                        )}
                        <span className="relative z-10">{opt.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
