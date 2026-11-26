import React, { useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

interface SpotlightCardProps {
    children: React.ReactNode;
    className?: string;
    spotlightColor?: string;
}

/**
 * Restrained pointer-reactive spotlight for workspace panels.
 */
export default function SpotlightCard({
    children,
    className = '',
    spotlightColor = 'rgba(255, 255, 255, 0.035)',
}: SpotlightCardProps) {
    const prefersReduced = useReducedMotion();
    const cardRef = useRef<HTMLDivElement | null>(null);
    const [pos, setPos] = useState({ x: 0, y: 0, active: false });

    const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (prefersReduced || !cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top, active: true });
    };

    return (
        <div
            ref={cardRef}
            onMouseMove={onMouseMove}
            onMouseLeave={() => setPos((p) => ({ ...p, active: false }))}
            className={`relative overflow-hidden ${className}`}
        >
            {!prefersReduced && pos.active && (
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-200"
                    style={{
                        background: `radial-gradient(360px circle at ${pos.x}px ${pos.y}px, ${spotlightColor}, transparent 70%)`,
                    }}
                />
            )}
            <div className="relative z-10 flex flex-col flex-1 h-full">{children}</div>
        </div>
    );
}
