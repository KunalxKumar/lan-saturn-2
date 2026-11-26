import React, { useState } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    KeyRound,
    ShieldAlert,
    ShieldCheck,
} from 'lucide-react';
import bobIcon from '../../../assets/icons/duotone/02-bob.svg';
import SpotlightCard from '../motion/SpotlightCard';
import DecryptedText from '../motion/DecryptedText';
import CryptoInspector from './CryptoInspector';
import type { PeerIdentity } from '../../crypto-lab/session';
import type { SecureChatSession, SecureMode, SecurePacket } from '../../crypto-lab/secureChat';

export interface BobInboxEntry {
    id: string;
    status: 'accepted' | 'rejected';
    sequence: number;
    plaintext?: string;
    reason?: string;
    timestamp: string;
    attackTag?: string;
    mode?: SecureMode;
    packet?: SecurePacket;
    latencyMs?: number;
    /** CBC accepted a tampered ciphertext: plaintext is silently corrupted. */
    corrupted?: boolean;
    /** Packet was rejected/dropped by the AEAD tag or replay guard. */
    blocked?: boolean;
}

interface BobPanelProps {
    identity: PeerIdentity | null;
    session: SecureChatSession | null;
    inbox: BobInboxEntry[];
}

export default function BobPanel({ identity, session, inbox }: BobPanelProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    return (
        <SpotlightCard className="flex flex-col bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    <img src={bobIcon} alt="" className="w-6 h-6 shrink-0" />
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Bob</h3>
                            {session?.verified && (
                                <ShieldCheck
                                    className="w-3.5 h-3.5 text-[var(--accent-secure)] shrink-0"
                                    aria-label="Peer identity verified"
                                />
                            )}
                        </div>
                        <p className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                            RECEIVER · SESSION {String(session?.lastRecvSequence ?? 0).padStart(3, '0')}
                        </p>
                    </div>
                </div>
                <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded bg-[var(--bg-canvas)] text-[var(--accent-secure)] border border-[var(--border-subtle)]">
                    {session?.seenSequences.size ?? 0} verified
                </span>
            </div>

            {identity && (
                <div className="px-4 py-2 bg-[var(--bg-canvas)] border-b border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-secondary)] flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 truncate" title={identity.fingerprint}>
                        <KeyRound className="w-3 h-3 text-[var(--accent-secure)] shrink-0" />
                        {identity.fingerprint}
                    </span>
                    <span className="text-[var(--text-muted)] shrink-0">Replay guard on</span>
                </div>
            )}

            <div className="flex-1 p-3 space-y-2 min-h-[240px] max-h-[380px] overflow-y-auto bg-[var(--bg-canvas)]">
                {inbox.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-xs text-[var(--text-muted)] py-8">
                        <ShieldCheck className="w-4 h-4 mb-2 text-[var(--text-muted)]" />
                        Waiting for authenticated packets…
                    </div>
                ) : (
                    inbox.map((entry) => {
                        const expanded = expandedId === entry.id;
                        const toggle = () => setExpandedId(expanded ? null : entry.id);

                        // Rejected / dropped — inline security event card.
                        if (entry.status === 'rejected') {
                            return (
                                <div key={entry.id}>
                                    <button
                                        type="button"
                                        onClick={toggle}
                                        className="lab-event--blocked w-full rounded-lg px-3 py-2 text-left text-xs cursor-pointer"
                                        aria-expanded={expanded}
                                    >
                                        <div className="flex items-center justify-between gap-2 text-[10px] font-mono tabular-nums text-[var(--accent-danger)] mb-1">
                                            <span className="flex items-center gap-1 font-semibold">
                                                <ShieldAlert className="w-3 h-3" />
                                                BLOCKED {entry.attackTag ? `· ${entry.attackTag}` : ''}
                                            </span>
                                            <span>
                                                #{entry.sequence} · {entry.timestamp}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-[var(--text-primary)] flex items-start gap-1.5">
                                            <AlertTriangle className="w-3.5 h-3.5 text-[var(--accent-danger)] shrink-0 mt-0.5" />
                                            <span>{entry.reason}</span>
                                        </div>
                                        {expanded && entry.packet && (
                                            <CryptoInspector
                                                packet={entry.packet}
                                                latencyMs={entry.latencyMs}
                                                verified={false}
                                            />
                                        )}
                                    </button>
                                </div>
                            );
                        }

                        // Accepted but silently corrupted (CBC tamper).
                        if (entry.corrupted) {
                            return (
                                <div key={entry.id}>
                                    <button
                                        type="button"
                                        onClick={toggle}
                                        className="lab-bubble--corrupt w-full rounded-lg px-3 py-2 text-left text-xs cursor-pointer"
                                        aria-expanded={expanded}
                                    >
                                        <div className="flex items-center justify-between gap-2 text-[10px] font-mono tabular-nums text-[var(--accent-danger)] mb-1">
                                            <span className="flex items-center gap-1 font-semibold">
                                                <AlertTriangle className="w-3 h-3" />
                                                SILENT CORRUPTION · {entry.mode}
                                            </span>
                                            <span>
                                                #{entry.sequence} · {entry.timestamp}
                                            </span>
                                        </div>
                                        <div className="break-words text-[var(--text-primary)] font-mono">
                                            {entry.plaintext}
                                        </div>
                                        <div className="mt-1 text-[10px] text-[var(--accent-danger)]">
                                            No MAC/tag: the corrupted plaintext was accepted as valid.
                                        </div>
                                        {expanded && entry.packet && (
                                            <CryptoInspector
                                                packet={entry.packet}
                                                latencyMs={entry.latencyMs}
                                                verified={false}
                                            />
                                        )}
                                    </button>
                                </div>
                            );
                        }

                        // Accepted + verified.
                        const gcm = entry.mode !== 'AES-256-CBC';
                        return (
                            <div key={entry.id}>
                                <button
                                    type="button"
                                    onClick={toggle}
                                    className="lab-bubble--received w-full rounded-lg px-3 py-2 text-left text-xs cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
                                    aria-expanded={expanded}
                                >
                                    <div
                                        className={`flex items-center justify-between gap-2 text-[10px] font-mono tabular-nums mb-1 ${
                                            gcm ? 'text-[var(--accent-secure)]' : 'text-[var(--accent-warn)]'
                                        }`}
                                    >
                                        <span className="flex items-center gap-1 font-semibold">
                                            {gcm ? (
                                                <CheckCircle2 className="w-3 h-3" />
                                            ) : (
                                                <AlertTriangle className="w-3 h-3" />
                                            )}
                                            {gcm ? 'Verified & decrypted' : 'CBC · unauthenticated'}
                                        </span>
                                        <span className="text-[var(--text-muted)]">
                                            #{entry.sequence} · {entry.timestamp}
                                        </span>
                                    </div>
                                    <div className="break-words text-[var(--text-primary)]">
                                        <DecryptedText text={entry.plaintext ?? ''} />
                                    </div>
                                    {gcm && (
                                        <div className="mt-1 flex items-center gap-1 text-[10px] text-[var(--accent-secure)]/80">
                                            <ShieldCheck className="w-3 h-3" />
                                            <span>Authenticated with AES-256-GCM</span>
                                            {typeof entry.latencyMs === 'number' && (
                                                <span className="font-mono tabular-nums text-[var(--text-muted)]">
                                                    · {entry.latencyMs.toFixed(3)} ms
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {expanded && entry.packet && (
                                        <CryptoInspector
                                            packet={entry.packet}
                                            latencyMs={entry.latencyMs}
                                            verified={gcm}
                                        />
                                    )}
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </SpotlightCard>
    );
}
