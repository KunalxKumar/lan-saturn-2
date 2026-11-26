import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

interface DecryptedTextProps {
    text: string;
    className?: string;
    speedMs?: number;
}

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

/**
 * Visual-only representation of plaintext resolving after AEAD verification succeeds.
 * Never used for failed/rejected packets.
 */
export default function DecryptedText({ text, className = '', speedMs = 22 }: DecryptedTextProps) {
    const prefersReduced = useReducedMotion();
    const [display, setDisplay] = useState(prefersReduced ? text : '');

    useEffect(() => {
        if (prefersReduced || !text) {
            setDisplay(text);
            return;
        }

        let revealed = 0;
        const interval = window.setInterval(() => {
            revealed += 1;
            const next = text
                .split('')
                .map((ch, idx) => {
                    if (ch === ' ' || idx < revealed) return ch;
                    return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
                })
                .join('');
            setDisplay(next);
            if (revealed >= text.length) {
                window.clearInterval(interval);
                setDisplay(text);
            }
        }, speedMs);

        return () => window.clearInterval(interval);
    }, [text, speedMs, prefersReduced]);

    return <span className={className}>{display}</span>;
}
