import React from 'react';
import { Radio, Sparkles } from 'lucide-react';
import eveIcon from '../../../assets/icons/duotone/03-eve.svg';
import inspectIcon from '../../../assets/icons/duotone/07-packet-inspector.svg';
import tamperIcon from '../../../assets/icons/duotone/08-tampering.svg';
import replayIcon from '../../../assets/icons/duotone/09-replay-attack.svg';
import keyIcon from '../../../assets/icons/duotone/10-key-exchange.svg';
import shieldIcon from '../../../assets/icons/duotone/06-verified-aead.svg';
import SpotlightCard from '../motion/SpotlightCard';
import AnimatedList from '../motion/AnimatedList';
import SlingButton from '../motion/SlingButton';
import { fromBase64, toHexPreview } from '../../crypto-lab/packet';
import type { SecureMode, SecurePacket } from '../../crypto-lab/secureChat';

export interface CapturedWireEvent {
    id: string;
    packet: SecurePacket;
    timestamp: string;
    status: 'verified' | 'rejected' | 'eavesdropped';
    label: string;
}

interface EveDashboardProps {
    captureLog: CapturedWireEvent[];
    selectedCaptureId: string | null;
    onSelectCapture: (event: CapturedWireEvent) => void;
    lastCapturedPacket: SecurePacket | null;
    onPassiveEavesdrop: () => void;
    onTamperCiphertext: () => void;
    onTamperAAD: () => void;
    onReplayPacket: () => void;
    onWrongKeyDecrypt: () => void;
    onMitmIdentityTest: () => void;
    onEducationalAesCbc: () => void;
    lastEveNote: string | null;
    armed: boolean;
    onToggleArmed: () => void;
    mode: SecureMode;
}

export default function EveDashboard({
    captureLog,
    selectedCaptureId,
    onSelectCapture,
    lastCapturedPacket,
    onPassiveEavesdrop,
    onTamperCiphertext,
    onTamperAAD,
    onReplayPacket,
    onWrongKeyDecrypt,
    onMitmIdentityTest,
    onEducationalAesCbc,
    lastEveNote,
    armed,
    onToggleArmed,
    mode,
}: EveDashboardProps) {
    const hasPacket = Boolean(lastCapturedPacket);
    const attacksDisabled = !hasPacket || !armed;

    const attackButton =
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs text-[var(--text-primary)] cursor-pointer text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

    return (
        <SpotlightCard className="flex flex-col bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    <img src={eveIcon} alt="" className="w-6 h-6 shrink-0" />
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                            Eve / Packet Interceptor
                        </h3>
                        <p className="text-[11px] font-mono text-[var(--accent-warn)] uppercase tracking-wider">
                            INTERCEPTED · ZERO KEYS
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={onToggleArmed}
                        aria-pressed={armed}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer transition-colors ${
                            armed
                                ? 'border-[var(--accent-danger)] bg-[var(--accent-danger-dim)] text-[var(--accent-danger)]'
                                : 'border-[var(--border-strong)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
                        }`}
                    >
                        <Radio className="w-3 h-3" />
                        {armed ? 'ARMED' : 'CANCEL'}
                    </button>
                    <span className="text-[10px] font-mono tabular-nums px-2 py-0.5 rounded bg-[var(--accent-warn-dim)] text-[var(--accent-warn)] border border-[var(--accent-warn)]">
                        {captureLog.length} frames
                    </span>
                </div>
            </div>

            {/* Live packet preview */}
            <div className="px-4 py-2.5 bg-[var(--bg-canvas)] border-b border-[var(--border-subtle)] font-mono text-[11px] space-y-0.5">
                {lastCapturedPacket ? (
                    <>
                        <div className="text-[var(--accent-warn)] font-semibold">
                            PACKET #{String(lastCapturedPacket.sequence).padStart(3, '0')} ·{' '}
                            {lastCapturedPacket.mode}
                        </div>
                        <div className="text-[var(--text-muted)] truncate">
                            nonce:{' '}
                            <span className="text-[var(--text-primary)] tabular-nums">
                                {toHexPreview(fromBase64(lastCapturedPacket.nonce), 8)}
                            </span>
                        </div>
                        <div className="text-[var(--text-muted)] truncate">
                            ciphertext:{' '}
                            <span className="text-[var(--accent-danger)] tabular-nums">
                                {toHexPreview(fromBase64(lastCapturedPacket.ciphertext), 10)}
                            </span>
                        </div>
                        <div className="text-[var(--text-muted)]">
                            plaintext: <span className="text-[var(--accent-danger)]">unavailable</span>
                        </div>
                    </>
                ) : (
                    <div className="text-[var(--text-muted)] py-2">
                        No packets intercepted yet. Send a message from Alice.
                    </div>
                )}
            </div>

            {/* Animated intercepted packet log */}
            {captureLog.length > 0 && (
                <div className="px-3 py-2 bg-[var(--bg-canvas)] border-b border-[var(--border-subtle)] max-h-[125px] overflow-y-auto">
                    <AnimatedList
                        items={captureLog}
                        getKey={(item) => item.id}
                        className="space-y-1.5"
                        renderItem={(item) => {
                            const selected = item.id === selectedCaptureId;
                            const statusClass =
                                item.status === 'rejected'
                                    ? 'border-[var(--accent-danger)] bg-[var(--accent-danger-dim)]'
                                    : selected
                                      ? 'border-[var(--accent-secure)] bg-[var(--accent-secure-dim)]'
                                      : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]';
                            return (
                                <button
                                    type="button"
                                    onClick={() => onSelectCapture(item)}
                                    className={`w-full text-left px-2.5 py-1.5 rounded border text-[11px] font-mono tabular-nums flex items-center justify-between gap-2 cursor-pointer transition-colors ${statusClass}`}
                                >
                                    <span className="truncate text-[var(--text-primary)]">
                                        #{String(item.packet.sequence).padStart(3, '0')} {item.packet.sender}→
                                        {item.packet.receiver} · {item.label}
                                    </span>
                                    <span
                                        className={
                                            item.status === 'rejected'
                                                ? 'text-[var(--accent-danger)] shrink-0'
                                                : 'text-[var(--accent-secure)] shrink-0'
                                        }
                                    >
                                        {item.timestamp}
                                    </span>
                                </button>
                            );
                        }}
                    />
                </div>
            )}

            {/* Attack controls */}
            <div className="p-3 grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={onPassiveEavesdrop}
                    disabled={attacksDisabled}
                    className={`${attackButton} bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] border-[var(--border-subtle)]`}
                >
                    <img src={inspectIcon} alt="" className="w-4 h-4 shrink-0" />
                    <span className="truncate">Inspect metadata</span>
                </button>
                <button
                    type="button"
                    onClick={onTamperCiphertext}
                    disabled={attacksDisabled}
                    className={`${attackButton} bg-[var(--bg-elevated)] hover:bg-[var(--accent-danger-dim)] border-[var(--border-subtle)] hover:border-[var(--accent-danger)]`}
                >
                    <img src={tamperIcon} alt="" className="w-4 h-4 shrink-0" />
                    <span className="truncate">Tamper packet</span>
                </button>
                <button
                    type="button"
                    onClick={onReplayPacket}
                    disabled={attacksDisabled}
                    className={`${attackButton} bg-[var(--bg-elevated)] hover:bg-[var(--accent-warn-dim)] border-[var(--border-subtle)] hover:border-[var(--accent-warn)]`}
                >
                    <img src={replayIcon} alt="" className="w-4 h-4 shrink-0" />
                    <span className="truncate">Replay packet</span>
                </button>
                <button
                    type="button"
                    onClick={onWrongKeyDecrypt}
                    disabled={attacksDisabled}
                    className={`${attackButton} bg-[var(--bg-elevated)] hover:bg-[var(--accent-danger-dim)] border-[var(--border-subtle)] hover:border-[var(--accent-danger)]`}
                >
                    <img src={keyIcon} alt="" className="w-4 h-4 shrink-0" />
                    <span className="truncate">Wrong-key test</span>
                </button>
                <button
                    type="button"
                    onClick={onMitmIdentityTest}
                    disabled={!armed}
                    className={`${attackButton} bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] border-[var(--border-subtle)]`}
                >
                    <img src={shieldIcon} alt="" className="w-4 h-4 shrink-0" />
                    <span className="truncate">MITM key swap</span>
                </button>
                <button
                    type="button"
                    onClick={onTamperAAD}
                    disabled={attacksDisabled}
                    className={`${attackButton} bg-[var(--bg-elevated)] hover:bg-[var(--accent-danger-dim)] border-[var(--border-subtle)] hover:border-[var(--accent-danger)]`}
                >
                    <img src={tamperIcon} alt="" className="w-4 h-4 shrink-0" />
                    <span className="truncate">Spoof AAD</span>
                </button>
            </div>

            <div className="px-3 pb-3 space-y-2">
                <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                        type="button"
                        onClick={onEducationalAesCbc}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded bg-[var(--bg-canvas)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] cursor-pointer"
                    >
                        <Sparkles className="w-3 h-3 text-[var(--accent-warn)]" />
                        {mode === 'AES-256-CBC' ? 'CBC mode active' : 'Compare AES-CBC'}
                    </button>
                    <SlingButton
                        size={48}
                        tapSends={true}
                        disabled={attacksDisabled}
                        onSend={onTamperCiphertext}
                        padColor="#FF2A5F"
                        iconColor="#050505"
                        wellColor="#121216"
                        bandColor="#32323D"
                        accentColor="#FF2A5F"
                        ariaLabel="Inject attack packet"
                    />
                </div>
                {lastEveNote && (
                    <div className="p-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-secondary)] leading-relaxed">
                        {lastEveNote}
                    </div>
                )}
            </div>
        </SpotlightCard>
    );
}
