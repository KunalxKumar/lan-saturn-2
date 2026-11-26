import React from 'react';
import { Check, Copy, LockKeyhole, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import SlingButton from '../motion/SlingButton';
import type { PeerIdentity } from '../../crypto-lab/session';
import type { SecureChatSession, SecureMode } from '../../crypto-lab/secureChat';
import { formatSafetyNumber } from '../../crypto-lab/secureChat';

interface SessionSecurityHeaderProps {
    aliceIdentity: PeerIdentity | null;
    bobIdentity: PeerIdentity | null;
    session: SecureChatSession | null;
    mode: SecureMode;
    onModeChange: (mode: SecureMode) => void;
    wrongKey: boolean;
    onWrongKeyChange: (value: boolean) => void;
    safetyNumber: string;
    safetyVerified: boolean;
    onVerify: () => void;
    onCopy: () => void;
    onRekey: () => void;
    disabled?: boolean;
}

const MODES: SecureMode[] = ['AES-256-GCM', 'AES-256-CBC'];

export default function SessionSecurityHeader({
    aliceIdentity,
    bobIdentity,
    session,
    mode,
    onModeChange,
    wrongKey,
    onWrongKeyChange,
    safetyNumber,
    safetyVerified,
    onVerify,
    onCopy,
    onRekey,
    disabled,
}: SessionSecurityHeaderProps) {
    const peerReady = Boolean(aliceIdentity && bobIdentity && session?.verified);
    const gcm = mode === 'AES-256-GCM';

    return (
        <section
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3 lg:p-4"
            aria-label="Session security"
        >
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                {/* Peer status */}
                <div className="flex items-center gap-2 min-w-0">
                    <span
                        className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${
                            peerReady ? 'bg-[var(--accent-secure)]' : 'bg-[var(--accent-warn)]'
                        }`}
                    />
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)]">
                            {peerReady ? (
                                <ShieldCheck className="w-4 h-4 text-[var(--accent-secure)]" />
                            ) : (
                                <ShieldAlert className="w-4 h-4 text-[var(--accent-warn)]" />
                            )}
                            <span>Alice ↔ Bob</span>
                        </div>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                            {peerReady ? 'Peer verified · handshake complete' : 'Handshake incomplete'}
                        </p>
                    </div>
                </div>

                {/* Cipher mode toggle */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Cipher</span>
                    <div
                        className="flex rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] p-0.5"
                        role="group"
                        aria-label="Cipher mode"
                    >
                        {MODES.map((candidate) => {
                            const active = mode === candidate;
                            const isGcm = candidate === 'AES-256-GCM';
                            return (
                                <button
                                    key={candidate}
                                    type="button"
                                    onClick={() => onModeChange(candidate)}
                                    aria-pressed={active}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
                                        active
                                            ? isGcm
                                                ? 'bg-[var(--accent-secure-dim)] text-[var(--accent-secure)] border border-[var(--accent-secure)]'
                                                : 'bg-[var(--accent-warn-dim)] text-[var(--accent-warn)] border border-[var(--accent-warn)]'
                                            : 'text-[var(--text-secondary)] border border-transparent hover:bg-[var(--bg-hover)]'
                                    }`}
                                >
                                    {candidate}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Wrong-key toggle */}
                <button
                    type="button"
                    onClick={() => onWrongKeyChange(!wrongKey)}
                    aria-pressed={wrongKey}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-mono transition-colors cursor-pointer ${
                        wrongKey
                            ? 'border-[var(--accent-danger)] bg-[var(--accent-danger-dim)] text-[var(--accent-danger)]'
                            : 'border-[var(--border-strong)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                >
                    <LockKeyhole className="w-3.5 h-3.5" />
                    <span>Simulate wrong key</span>
                    <span
                        className={`relative inline-flex h-3.5 w-7 items-center rounded-full transition-colors ${
                            wrongKey ? 'bg-[var(--accent-danger)]' : 'bg-[var(--border-strong)]'
                        }`}
                    >
                        <span
                            className={`absolute h-2.5 w-2.5 rounded-full bg-[var(--bg-canvas)] transition-transform ${
                                wrongKey ? 'translate-x-[15px]' : 'translate-x-[2px]'
                            }`}
                        />
                    </span>
                </button>

                {/* Safety number */}
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                        Safety number
                    </span>
                    <button
                        type="button"
                        onClick={onCopy}
                        disabled={!safetyNumber}
                        title="Click to copy safety number"
                        className="group flex items-center gap-1.5 rounded-md border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-2 py-1 font-mono text-[11px] text-[var(--text-primary)] tabular-nums hover:bg-[var(--bg-hover)] disabled:opacity-40 cursor-pointer"
                    >
                        <span>{safetyNumber ? formatSafetyNumber(safetyNumber) : '— — —'}</span>
                        <Copy className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]" />
                    </button>
                    <button
                        type="button"
                        onClick={onVerify}
                        disabled={!safetyNumber}
                        className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                            safetyVerified
                                ? 'border-[var(--accent-secure)] bg-[var(--accent-secure-dim)] text-[var(--accent-secure)]'
                                : 'border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                        } disabled:opacity-40`}
                    >
                        {safetyVerified ? <Check className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                        {safetyVerified ? 'Verified' : 'Verify'}
                    </button>
                </div>

                {/* Rekey */}
                <div className="ml-auto flex items-center gap-2">
                    <div className="text-right hidden sm:block">
                        <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Rekey</div>
                        <div className="text-[10px] font-mono text-[var(--text-secondary)] flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            pull to rotate
                        </div>
                    </div>
                    <SlingButton
                        size={40}
                        tapSends={false}
                        disabled={disabled}
                        onSend={onRekey}
                        padColor="#FAFAFA"
                        iconColor="#050505"
                        wellColor="#121216"
                        bandColor="#32323D"
                        accentColor="#00FF66"
                        ariaLabel="Rekey session (forward secrecy)"
                    />
                </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-mono">
                <span
                    className={`px-1.5 py-0.5 rounded border ${
                        gcm
                            ? 'border-[var(--accent-secure)] text-[var(--accent-secure)] bg-[var(--accent-secure-dim)]'
                            : 'border-[var(--accent-warn)] text-[var(--accent-warn)] bg-[var(--accent-warn-dim)]'
                    }`}
                >
                    {gcm ? 'AEAD · integrity enforced' : 'UNAUTHENTICATED · bit-flips go undetected'}
                </span>
                <span className="text-[var(--text-muted)]">
                    X25519 · HKDF-SHA256 · AAD sender|receiver|seq · 96-bit GCM nonce
                </span>
            </div>
        </section>
    );
}
