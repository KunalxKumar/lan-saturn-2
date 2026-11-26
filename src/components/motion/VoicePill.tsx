import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Mic, X } from 'lucide-react';

interface VoicePillProps {
    onSendVoiceNote: (audioFile: File | null, durationSec: number) => void;
    disabled?: boolean;
}

export default function VoicePill({ onSendVoiceNote, disabled }: VoicePillProps) {
    const prefersReduced = useReducedMotion();
    const [recording, setRecording] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [bars, setBars] = useState([0.3, 0.6, 0.45, 0.8, 0.5]);

    const streamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const stopMedia = () => {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop();
        }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        recorderRef.current = null;
    };

    useEffect(() => {
        if (!recording) return;
        const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
        const eq = window.setInterval(() => {
            if (!prefersReduced) {
                setBars([0, 1, 2, 3, 4].map(() => 0.25 + Math.random() * 0.75));
            }
        }, 160);

        return () => {
            window.clearInterval(timer);
            window.clearInterval(eq);
        };
    }, [recording, prefersReduced]);

    useEffect(() => () => stopMedia(), []);

    const startRecording = async () => {
        if (disabled) return;
        chunksRef.current = [];
        setSeconds(0);
        setRecording(true);

        try {
            if (navigator.mediaDevices?.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;
                const rec = new MediaRecorder(stream);
                rec.ondataavailable = (e) => {
                    if (e.data.size > 0) chunksRef.current.push(e.data);
                };
                rec.start();
                recorderRef.current = rec;
            }
        } catch {
            // Fallback to simulated timer if mic permission is denied or unavailable
        }
    };

    const handleCancel = () => {
        setRecording(false);
        stopMedia();
        setSeconds(0);
    };

    const handleFinish = () => {
        const duration = Math.max(1, seconds);
        const rec = recorderRef.current;

        if (rec && rec.state !== 'inactive') {
            rec.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const file = blob.size > 0 ? new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' }) : null;
                onSendVoiceNote(file, duration);
            };
        } else {
            onSendVoiceNote(null, duration);
        }

        setRecording(false);
        stopMedia();
        setSeconds(0);
    };

    const fmtTime = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

    if (!recording) {
        return (
            <button
                type="button"
                onClick={() => void startRecording()}
                disabled={disabled}
                className="text-on-surface-variant hover:text-primary p-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-40"
                title="Record Voice Message"
                aria-label="Record Voice Message"
            >
                <Mic size={18} />
            </button>
        );
    }

    return (
        <motion.div
            initial={prefersReduced ? false : { scale: 0.9, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[var(--accent-danger-dim)] border border-[var(--accent-danger)] text-xs"
        >
            <span className="w-2 h-2 rounded-full bg-[var(--accent-danger)] animate-pulse shrink-0" />
            <div className="flex items-center gap-0.5 h-3.5" aria-hidden="true">
                {bars.map((h, i) => (
                    <span
                        key={i}
                        className="w-0.5 rounded-full bg-[var(--accent-danger)] transition-all duration-150"
                        style={{ height: `${Math.round(h * 14)}px` }}
                    />
                ))}
            </div>
            <span className="font-mono text-[11px] text-[var(--accent-danger)] tabular-nums">{fmtTime}</span>
            <button
                type="button"
                onClick={handleCancel}
                className="p-0.5 rounded-full hover:bg-white/10 text-[var(--text-secondary)] cursor-pointer"
                title="Cancel recording"
                aria-label="Cancel recording"
            >
                <X size={13} />
            </button>
            <button
                type="button"
                onClick={handleFinish}
                className="p-0.5 rounded-full bg-[var(--accent-secure-dim)] hover:bg-[var(--accent-secure-dim)] text-[var(--accent-secure)] cursor-pointer"
                title="Send voice note"
                aria-label="Send voice note"
            >
                <Check size={13} />
            </button>
        </motion.div>
    );
}
