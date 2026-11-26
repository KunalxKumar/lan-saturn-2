import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

interface CountUpProps {
    value: number;
    decimals?: number;
    suffix?: string;
    className?: string;
}

export default function CountUp({ value, decimals = 0, suffix = '', className = '' }: CountUpProps) {
    const prefersReduced = useReducedMotion();
    const [display, setDisplay] = useState(value);
    const prevRef = useRef(value);

    useEffect(() => {
        if (prefersReduced || prevRef.current === value) {
            prevRef.current = value;
            setDisplay(value);
            return;
        }

        const start = prevRef.current;
        const diff = value - start;
        const duration = 260;
        const t0 = performance.now();
        let rafId = 0;

        const step = (now: number) => {
            const p = Math.min(1, (now - t0) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setDisplay(start + diff * eased);
            if (p < 1) {
                rafId = requestAnimationFrame(step);
            } else {
                prevRef.current = value;
                setDisplay(value);
            }
        };

        rafId = requestAnimationFrame(step);
        return () => cancelAnimationFrame(rafId);
    }, [value, prefersReduced]);

    return (
        <span className={className}>
            {display.toFixed(decimals)}
            {suffix}
        </span>
    );
}
