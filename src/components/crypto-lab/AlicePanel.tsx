import React, { useState } from 'react';
import { ChevronDown, ChevronRight, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import aliceIcon from '../../../assets/icons/duotone/01-alice.svg';
import SpotlightCard from '../motion/SpotlightCard';
import SlingButton from '../motion/SlingButton';
import CryptoInspector from './CryptoInspector';
import type { PeerIdentity } from '../../crypto-lab/session';
import type { SecureChatSession, SecureMode, SecurePacket } from '../../crypto-lab/secureChat';

export interface SentMessageLog {
    id: string;
    sequence: number;
    plaintext: string;
    timestamp: string;
    packet: SecurePacket;
    mode: SecureMode;
    latencyMs: number;
}

interface AlicePanelProps {
    identity: PeerIdentity | null;
    session: SecureChatSession | null;
    sentMessages: SentMessageLog[];
    mode: SecureMode;
    onSendEncrypted: (plaintext: string) => void;
    disabled?: boolean;
}

export default function AlicePanel({
    identity,
    session,
    sentMessages,
    mode,
    onSendEncrypted,
    disabled,
}: AlicePanelProps) {
    const [draft, setDraft] = useState('Hello Bob, this is a secret message.');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const canSend = Boolean(draft.trim()) && !disabled;
    const accent = mode === 'AES-256-GCM' ? '#00FF66' : '#FFB800';

    const sendMessage = () => {
        if (!canSend) return;
        onSendEncrypted(draft.trim());
        setDraft('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <SpotlightCard className="flex flex-col bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    <img src={aliceIcon} alt="" className="w-6 h-6 shrink-0" />
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Alice</h3>
                            {session?.verified && (
                                <ShieldCheck
                                    className="w-3.5 h-3.5 text-[var(--accent-secure)] shrink-0"
                                    aria-label="Verified session"
                                />
                            )}
                        </div>
                        <p className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                            SENDER · SESSION {String(session?.sendSequence ?? 0).padStart(3, '0')}
                        </p>
                    </div>
                </div>
                <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded bg-[var(--bg-canvas)] text-[var(--accent-secure)] border border-[var(--border-subtle)]">
                    seq #{session?.sendSequence ?? 0}
                </span>
            </div>

            {identity && (
                <div className="px-4 py-2 bg-[var(--bg-canvas)] border-b border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-secondary)] flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 truncate" title={identity.fingerprint}>
                        <KeyRound className="w-3 h-3 text-[var(--accent-secure)] shrink-0" />
                        {identity.fingerprint}
                    </span>
                    <span className="text-[var(--text-muted)] shrink-0">
                        {session?.sessionId.slice(0, 10)}
                    </span>
                </div>
            )}

            <div className="flex-1 p-3 space-y-2 min-h-[240px] max-h-[320px] overflow-y-auto bg-[var(--bg-canvas)]">
                {sentMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-xs text-[var(--text-muted)] py-8">
                        <Lock className="w-4 h-4 mb-2 text-[var(--text-muted)]" />
                        Send an authenticated encrypted message to Bob.
                    </div>
                ) : (
                    sentMessages.map((msg) => {
                        const expanded = expandedId === msg.id;
                        return (
                            <div key={msg.id} className="flex flex-col items-end">
                                <button
                                    type="button"
                                    onClick={() => setExpandedId(expanded ? null : msg.id)}
                                    className="lab-bubble--sent w-full max-w-[94%] rounded-lg px-3 py-2 text-left text-[var(--text-primary)] text-xs cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
                                    aria-expanded={expanded}
                                >
                                    <div className="flex items-start gap-1.5">
                                        {expanded ? (
                                            <ChevronDown className="w-3 h-3 mt-0.5 shrink-0 text-[var(--text-muted)]" />
                                        ) : (
                                            <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-[var(--text-muted)]" />
                                        )}
                                        <span className="break-words flex-1">{msg.plaintext}</span>
                                    </div>
                                    <div className="mt-1 flex items-center justify-end gap-2 text-[10px] font-mono tabular-nums text-[var(--accent-secure)]/90">
                                        <span>
                                            Encrypted &amp; sent · #{msg.sequence} · {msg.mode}
                                        </span>
                                        <span className="text-[var(--text-muted)]">{msg.timestamp}</span>
                                    </div>
                                    {expanded && (
                                        <CryptoInspector packet={msg.packet} latencyMs={msg.latencyMs} verified />
                                    )}
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            <form
                onSubmit={handleSubmit}
                className="p-3 bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)] flex items-center gap-2"
            >
                <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={disabled ? 'Waiting for handshake…' : 'Message as Alice…'}
                    aria-label="Plaintext message as Alice"
                    className="flex-1 min-w-0 bg-[var(--bg-canvas)] border border-[var(--border-strong)] rounded-md px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus-visible:outline-none focus-visible:border-[var(--accent-secure)] disabled:opacity-50"
                    disabled={disabled}
                />
                <SlingButton
                    size={44}
                    tapSends={true}
                    onSend={sendMessage}
                    disabled={!canSend}
                    padColor="#FAFAFA"
                    iconColor="#050505"
                    wellColor="#121216"
                    bandColor="#32323D"
                    accentColor={accent}
                    ariaLabel="Encrypt and send message"
                />
            </form>
        </SpotlightCard>
    );
}
