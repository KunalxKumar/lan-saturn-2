import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Lock } from 'lucide-react';
import inspectIcon from '../../../assets/icons/duotone/07-packet-inspector.svg';
import { fromBase64 } from '../../crypto-lab/packet';
import type { SecureMode, SecurePacket } from '../../crypto-lab/secureChat';

interface PacketInspectorProps {
    packet: SecurePacket | null;
    plaintextPreview?: string;
    mode?: SecureMode;
    latencyMs?: number;
}

function snippet(value: string, chars = 44): string {
    return value.length > chars ? `${value.slice(0, chars)}…` : value;
}

export default function PacketInspector({ packet, plaintextPreview, mode, latencyMs }: PacketInspectorProps) {
    const prefersReduced = useReducedMotion();

    if (!packet) {
        return (
            <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-4 text-xs text-[var(--text-muted)] flex items-center gap-2">
                <img src={inspectIcon} alt="" className="w-4 h-4 shrink-0" />
                Send a message from Alice to inspect the live {mode ?? 'AES-256-GCM'} wire packet.
            </div>
        );
    }

    const nonceBytes = fromBase64(packet.nonce).length;
    const cipherBytes = fromBase64(packet.ciphertext).length;
    const jsonPayload = JSON.stringify(packet, null, 2);
    const leaked = Boolean(plaintextPreview && jsonPayload.includes(plaintextPreview));

    return (
        <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl overflow-hidden"
        >
            <div className="p-4 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                    <img src={inspectIcon} alt="" className="w-4 h-4 shrink-0" />
                    Wire Packet &amp; AAD Inspector
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono tabular-nums text-[var(--text-secondary)]">
                    <span
                        className={
                            packet.mode === 'AES-256-GCM'
                                ? 'text-[var(--accent-secure)]'
                                : 'text-[var(--accent-warn)]'
                        }
                    >
                        {packet.mode}
                    </span>
                    <span>·</span>
                    <span>Nonce: {nonceBytes}B</span>
                    <span>·</span>
                    <span>Ciphertext{packet.mode === 'AES-256-GCM' ? '+Tag' : ''}: {cipherBytes}B</span>
                    {typeof latencyMs === 'number' && (
                        <>
                            <span>·</span>
                            <span>{latencyMs.toFixed(3)} ms</span>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 text-xs">
                <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Base64 &amp; Metadata Summary
                    </div>
                    <div className="lab-inspector p-4 space-y-2">
                        <div className="flex justify-between gap-2">
                            <span className="text-[var(--text-muted)]">Route:</span>
                            <span className="text-[var(--text-primary)]">
                                {packet.sender} → {packet.receiver}
                            </span>
                        </div>
                        <div className="flex justify-between gap-2">
                            <span className="text-[var(--text-muted)]">Mode:</span>
                            <span
                                className={
                                    packet.mode === 'AES-256-GCM'
                                        ? 'text-[var(--accent-secure)]'
                                        : 'text-[var(--accent-warn)]'
                                }
                            >
                                {packet.mode}
                            </span>
                        </div>
                        <div className="flex justify-between gap-2">
                            <span className="text-[var(--text-muted)]">Sequence (AAD):</span>
                            <span className="text-[var(--text-primary)]">#{packet.sequence}</span>
                        </div>
                        <div className="flex justify-between gap-2 gap-y-1">
                            <span className="text-[var(--text-muted)] shrink-0">Nonce (b64):</span>
                            <span className="text-[var(--accent-warn)] truncate" title={packet.nonce}>
                                {snippet(packet.nonce)}
                            </span>
                        </div>
                        <div className="flex justify-between gap-2">
                            <span className="text-[var(--text-muted)] shrink-0">Ciphertext (b64):</span>
                            <span className="text-[var(--accent-danger)] truncate" title={packet.ciphertext}>
                                {snippet(packet.ciphertext)}
                            </span>
                        </div>
                        <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                            <span className="text-[var(--text-muted)] flex items-center gap-1.5">
                                <Lock className="w-3 h-3 text-[var(--accent-secure)]" />
                                Plaintext in wire JSON:
                            </span>
                            <span
                                className={
                                    leaked
                                        ? 'text-[var(--accent-danger)] font-bold'
                                        : 'text-[var(--accent-secure)] font-semibold'
                                }
                            >
                                {leaked ? 'LEAKED' : 'HIDDEN (0 bytes)'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Structured JSON Packet (v{packet.version})
                    </div>
                    <pre className="lab-inspector p-4 overflow-x-auto max-h-[195px] text-[var(--text-secondary)]">
                        {jsonPayload}
                    </pre>
                </div>
            </div>
        </motion.div>
    );
}
