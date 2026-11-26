import React, { useEffect, useState } from 'react';
import { RotateCcw, Terminal } from 'lucide-react';
import appLogo from '../../../assets/icons/app-logo.svg';
import AlicePanel, { SentMessageLog } from './AlicePanel';
import BobPanel, { BobInboxEntry } from './BobPanel';
import EveDashboard, { CapturedWireEvent } from './EveDashboard';
import PacketInspector from './PacketInspector';
import SecurityResults from './SecurityResults';
import EncryptionSequencePlayer from './EncryptionSequencePlayer';
import HashingLab from './HashingLab';
import SessionSecurityHeader from './SessionSecurityHeader';
import CountUp from '../motion/CountUp';
import SwipeToast from '../motion/SwipeToast';
import GlideSelect from '../motion/GlideSelect';

import {
    PeerIdentity,
    createIdentity,
    createSignedHandshake,
    establishVerifiedSession,
} from '../../crypto-lab/session';
import type { SecureChatSession, SecureMode, SecurePacket } from '../../crypto-lab/secureChat';
import {
    computeSafetyNumber,
    createSecureSession,
    decryptSecureMessage,
    encryptSecureMessage,
    formatSafetyNumber,
    runSecureBenchmarks,
    runSecureExperimentSuite,
    tamperSecurePacket,
} from '../../crypto-lab/secureChat';
import { runIdentityMitmExperiment } from '../../crypto-lab/experiments';
import type { BenchmarkRow, ExperimentOutcome } from '../../crypto-lab/experiments';

const FUSE_SECURE = '#00FF66';
const FUSE_WARN = '#FFB800';
const FUSE_DANGER = '#FF2A5F';

interface LabToast {
    id: number;
    title: string;
    description: string;
    fuseColor: string;
    duration: number;
    closeButton?: boolean;
}

function nowTime(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function CryptoLabPage() {
    const [aliceIdentity, setAliceIdentity] = useState<PeerIdentity | null>(null);
    const [bobIdentity, setBobIdentity] = useState<PeerIdentity | null>(null);
    const [aliceSession, setAliceSession] = useState<SecureChatSession | null>(null);
    const [bobSession, setBobSession] = useState<SecureChatSession | null>(null);

    const [mode, setMode] = useState<SecureMode>('AES-256-GCM');
    const [wrongKey, setWrongKey] = useState(false);
    const [safetyNumber, setSafetyNumber] = useState('');
    const [safetyVerified, setSafetyVerified] = useState(false);
    const [armed, setArmed] = useState(true);

    const [sentMessages, setSentMessages] = useState<SentMessageLog[]>([]);
    const [bobInbox, setBobInbox] = useState<BobInboxEntry[]>([]);
    const [captureLog, setCaptureLog] = useState<CapturedWireEvent[]>([]);
    const [selectedCaptureId, setSelectedCaptureId] = useState<string | null>(null);
    const [inspectedPacket, setInspectedPacket] = useState<SecurePacket | null>(null);
    const [lastPlaintext, setLastPlaintext] = useState<string>('');
    const [lastLatency, setLastLatency] = useState<number | undefined>(undefined);
    const [lastEveNote, setLastEveNote] = useState<string | null>(null);
    const [outcomes, setOutcomes] = useState<ExperimentOutcome[]>([]);
    const [benchmarks, setBenchmarks] = useState<BenchmarkRow[]>([]);
    const [isBenchmarking, setIsBenchmarking] = useState(false);
    const [toasts, setToasts] = useState<LabToast[]>([]);
    const [labTab, setLabTab] = useState<'all' | 'simulation' | 'verify'>('all');

    const pushToast = (
        title: string,
        description: string,
        fuseColor: string,
        duration = 4000,
        closeButton = false
    ) => {
        setToasts((prev) => [
            ...prev.slice(-3),
            { id: Date.now() + Math.random(), title, description, fuseColor, duration, closeButton },
        ]);
    };

    const initLabSession = async (isRekey = false) => {
        const alice = await createIdentity('alice', 'Alice');
        const bob = await createIdentity('bob', 'Bob');
        const sessionId = `saturn-lab-${Date.now().toString(36)}`;

        const [aliceHs, bobHs] = await Promise.all([
            createSignedHandshake(alice, sessionId),
            createSignedHandshake(bob, sessionId),
        ]);

        const [aliceLab, bobLab] = await Promise.all([
            establishVerifiedSession({
                localIdentity: alice,
                localEphemeral: aliceHs.ephemeral,
                remoteBundle: bobHs.bundle,
                expectedPeerFingerprint: bob.fingerprint,
                isInitiator: true,
                initiatorId: alice.id,
                responderId: bob.id,
            }),
            establishVerifiedSession({
                localIdentity: bob,
                localEphemeral: bobHs.ephemeral,
                remoteBundle: aliceHs.bundle,
                expectedPeerFingerprint: alice.fingerprint,
                isInitiator: false,
                initiatorId: alice.id,
                responderId: bob.id,
            }),
        ]);

        const [aliceSecure, bobSecure, safety] = await Promise.all([
            createSecureSession(aliceLab),
            createSecureSession(bobLab),
            computeSafetyNumber(alice, bob),
        ]);

        setAliceIdentity(alice);
        setBobIdentity(bob);
        setAliceSession(aliceSecure);
        setBobSession(bobSecure);
        setSafetyNumber(safety);
        setSafetyVerified(false);

        setSentMessages([]);
        setBobInbox([]);
        setCaptureLog([]);
        setSelectedCaptureId(null);
        setInspectedPacket(null);
        setLastPlaintext('');
        setLastLatency(undefined);
        setOutcomes([]);
        setLastEveNote(
            `Authenticated X25519 + Ed25519 handshake complete. HKDF-SHA256 derived the AES-256 key pair.`
        );

        pushToast(
            isRekey ? 'Session Rekeyed' : 'Handshake Complete',
            isRekey
                ? 'Old key wiped · fresh X25519 → HKDF → AES-256 key active'
                : 'X25519 + HKDF-SHA256 → AES-256 session key derived',
            FUSE_SECURE,
            3500
        );
    };

    useEffect(() => {
        void initLabSession(false);
    }, []);

    const recordOutcome = (outcome: ExperimentOutcome) => {
        setOutcomes((prev) => [outcome, ...prev.filter((o) => o.id !== outcome.id)]);
    };

    const appendCapture = (
        packet: SecurePacket,
        status: CapturedWireEvent['status'],
        label: string
    ) => {
        const id = `cap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const entry: CapturedWireEvent = { id, packet, timestamp: nowTime(), status, label };
        setCaptureLog((prev) => [entry, ...prev].slice(0, 20));
        setSelectedCaptureId(id);
        setInspectedPacket(packet);
    };

    const handleSendEncrypted = async (plaintext: string) => {
        if (!aliceSession || !bobSession) return;

        const { packet, latencyMs } = await encryptSecureMessage(aliceSession, plaintext, mode);
        const ts = nowTime();

        setSentMessages((prev) => [
            ...prev,
            {
                id: `sent-${packet.sequence}-${Date.now()}`,
                sequence: packet.sequence,
                plaintext,
                timestamp: ts,
                packet,
                mode,
                latencyMs,
            },
        ]);
        setLastPlaintext(plaintext);
        setLastLatency(latencyMs);
        appendCapture(packet, 'verified', mode === 'AES-256-GCM' ? 'AEAD OK' : 'CBC SENT');

        try {
            const decrypted = await decryptSecureMessage(bobSession, packet, { useWrongKey: wrongKey });

            if (wrongKey && packet.mode === 'AES-256-CBC') {
                setBobInbox((prev) => [
                    ...prev,
                    {
                        id: `bob-wrong-${packet.sequence}-${Date.now()}`,
                        status: 'accepted',
                        sequence: packet.sequence,
                        plaintext: decrypted.plaintext,
                        timestamp: ts,
                        mode: packet.mode,
                        packet,
                        latencyMs: decrypted.latencyMs,
                        corrupted: true,
                        attackTag: 'Wrong Key',
                    },
                ]);
                setLastEveNote(
                    'Wrong key on CBC produced corrupted plaintext with no authentication error.'
                );
                pushToast(
                    'Wrong Key — CBC Silent Corruption',
                    'No MAC: garbage plaintext accepted as valid',
                    FUSE_DANGER,
                    6000,
                    true
                );
                return;
            }

            setBobInbox((prev) => [
                ...prev,
                {
                    id: `bob-${packet.sequence}-${Date.now()}`,
                    status: 'accepted',
                    sequence: decrypted.sequence,
                    plaintext: decrypted.plaintext,
                    timestamp: ts,
                    mode: packet.mode,
                    packet,
                    latencyMs: decrypted.latencyMs,
                },
            ]);
            setLastEveNote(
                `Relay forwarded seq #${packet.sequence} (${packet.ciphertext.length} chars b64). Plaintext absent.`
            );
        } catch (err: any) {
            const reason = err?.message || 'Decryption failed';
            appendCapture(packet, 'rejected', 'BLOCKED');
            setBobInbox((prev) => [
                ...prev,
                {
                    id: `bob-err-${Date.now()}`,
                    status: 'rejected',
                    sequence: packet.sequence,
                    reason,
                    timestamp: ts,
                    attackTag: wrongKey ? 'Wrong Key' : 'InvalidTag',
                    mode: packet.mode,
                    packet,
                    latencyMs,
                    blocked: true,
                },
            ]);
            setLastEveNote(`Dropped seq #${packet.sequence}: ${reason}`);
            pushToast(
                wrongKey ? 'Wrong Key Rejected' : 'Packet Dropped — InvalidTag',
                reason,
                FUSE_DANGER,
                6000,
                true
            );
        }
    };

    const handlePassiveEavesdrop = () => {
        if (!inspectedPacket) return;
        const wire = JSON.stringify(inspectedPacket);
        const leaked = lastPlaintext.length > 0 && wire.includes(lastPlaintext);
        setLastEveNote(
            leaked
                ? 'Plaintext detected in the wire packet!'
                : `Captured ${wire.length}B ${inspectedPacket.mode} packet. Nonce and ciphertext visible; plaintext absent.`
        );
        pushToast(
            leaked ? 'Plaintext Leaked' : 'Passive Eavesdrop',
            leaked ? 'Plaintext is visible on the wire' : 'Only ciphertext + nonce are exposed',
            leaked ? FUSE_DANGER : FUSE_SECURE,
            4000
        );
    };

    const handleTamperCiphertext = async () => {
        if (!inspectedPacket || !bobSession) return;
        const tampered = tamperSecurePacket(inspectedPacket, 'ciphertext');
        appendCapture(tampered, 'rejected', 'TAMPERED');
        setInspectedPacket(tampered);
        setLastLatency(undefined);

        try {
            const decrypted = await decryptSecureMessage(bobSession, tampered, { bypassReplay: true });
            setBobInbox((prev) => [
                ...prev,
                {
                    id: `tamper-${Date.now()}`,
                    status: 'accepted',
                    sequence: tampered.sequence,
                    plaintext: decrypted.plaintext,
                    timestamp: nowTime(),
                    mode: tampered.mode,
                    packet: tampered,
                    latencyMs: decrypted.latencyMs,
                    corrupted: true,
                    attackTag: 'Ciphertext Tampered',
                },
            ]);
            setLastEveNote(
                'CBC accepted tampered ciphertext — the plaintext was silently corrupted (no MAC).'
            );
            pushToast(
                'Silent Corruption — CBC',
                'Tampered ciphertext accepted; no integrity tag to reject it',
                FUSE_DANGER,
                6000,
                true
            );
        } catch (err: any) {
            const reason = err?.message || 'Authentication failed';
            setBobInbox((prev) => [
                ...prev,
                {
                    id: `tamper-${Date.now()}`,
                    status: 'rejected',
                    sequence: tampered.sequence,
                    reason,
                    attackTag: 'Ciphertext Tampered',
                    timestamp: nowTime(),
                    mode: tampered.mode,
                    packet: tampered,
                    blocked: true,
                },
            ]);
            setLastEveNote(`GCM InvalidTag: tampered packet dropped. ${reason}`);
            pushToast('Tampering Detected — Packet Dropped', 'GCM InvalidTag', FUSE_DANGER, 6000, true);
        }
    };

    const handleTamperAAD = async () => {
        if (!inspectedPacket || !bobSession) return;
        const tampered = tamperSecurePacket(inspectedPacket, 'aad');
        appendCapture(tampered, 'rejected', 'AAD SPOOF');
        setInspectedPacket(tampered);
        setLastLatency(undefined);

        try {
            const decrypted = await decryptSecureMessage(bobSession, tampered, {
                bypassReplay: true,
                allowSpoofedMetadata: true,
            });
            setBobInbox((prev) => [
                ...prev,
                {
                    id: `aad-${Date.now()}`,
                    status: 'accepted',
                    sequence: tampered.sequence,
                    plaintext: decrypted.plaintext,
                    timestamp: nowTime(),
                    mode: tampered.mode,
                    packet: tampered,
                    latencyMs: decrypted.latencyMs,
                    attackTag: 'AAD Spoof Accepted',
                },
            ]);
            setLastEveNote(
                'CBC has no associated-data authentication: the spoofed sender was accepted.'
            );
            pushToast(
                'AAD Spoof Accepted — CBC',
                'Sender metadata is not authenticated in CBC mode',
                FUSE_WARN,
                5000,
                true
            );
        } catch (err: any) {
            const reason = err?.message || 'AAD mismatch';
            setBobInbox((prev) => [
                ...prev,
                {
                    id: `aad-${Date.now()}`,
                    status: 'rejected',
                    sequence: tampered.sequence,
                    reason,
                    attackTag: 'AAD Metadata Spoof',
                    timestamp: nowTime(),
                    mode: tampered.mode,
                    packet: tampered,
                    blocked: true,
                },
            ]);
            setLastEveNote(`Spoofed sender metadata rejected: ${reason}`);
            pushToast(
                'Tampering Detected — Packet Dropped',
                'GCM AAD authentication failed',
                FUSE_DANGER,
                6000,
                true
            );
        }
    };

    const handleReplayPacket = async () => {
        if (!inspectedPacket || !bobSession) return;
        appendCapture(inspectedPacket, 'rejected', 'REPLAY');

        try {
            await decryptSecureMessage(bobSession, inspectedPacket);
            setLastEveNote('ERROR: the replayed packet was accepted.');
            pushToast('Replay Accepted?!', 'Sequence guard failed', FUSE_DANGER, 5000, true);
        } catch (err: any) {
            const reason = err?.message || 'Replay detected';
            setBobInbox((prev) => [
                ...prev,
                {
                    id: `replay-${Date.now()}`,
                    status: 'rejected',
                    sequence: inspectedPacket.sequence,
                    reason,
                    attackTag: 'Replay Attack',
                    timestamp: nowTime(),
                    mode: inspectedPacket.mode,
                    packet: inspectedPacket,
                    blocked: true,
                },
            ]);
            setLastEveNote(`Replay blocked: ${reason}`);
            pushToast('Replay Attack Blocked', 'Stale sequence number rejected', FUSE_WARN, 5000, true);
        }
    };

    const handleWrongKeyDecrypt = async () => {
        if (!inspectedPacket || !bobSession) return;

        try {
            const decrypted = await decryptSecureMessage(bobSession, inspectedPacket, {
                useWrongKey: true,
                bypassReplay: true,
            });
            setBobInbox((prev) => [
                ...prev,
                {
                    id: `wrong-${Date.now()}`,
                    status: 'accepted',
                    sequence: inspectedPacket.sequence,
                    plaintext: decrypted.plaintext,
                    timestamp: nowTime(),
                    mode: inspectedPacket.mode,
                    packet: inspectedPacket,
                    latencyMs: decrypted.latencyMs,
                    corrupted: true,
                    attackTag: 'Wrong Key',
                },
            ]);
            setLastEveNote('Wrong key on CBC produced garbage without an integrity error.');
            pushToast(
                'Wrong Key — CBC Silent Corruption',
                'CBC has no MAC to reject the wrong key',
                FUSE_DANGER,
                6000,
                true
            );
        } catch (err: any) {
            const reason = err?.message || 'Decryption failed';
            setBobInbox((prev) => [
                ...prev,
                {
                    id: `wrong-${Date.now()}`,
                    status: 'rejected',
                    sequence: inspectedPacket.sequence,
                    reason,
                    attackTag: 'Wrong Key',
                    timestamp: nowTime(),
                    mode: inspectedPacket.mode,
                    packet: inspectedPacket,
                    blocked: true,
                },
            ]);
            setLastEveNote(`Wrong key rejected: ${reason}`);
            pushToast('Wrong Key Rejected', reason, FUSE_DANGER, 5000, true);
        }
    };

    const handleMitmIdentity = async () => {
        if (!aliceIdentity || !bobIdentity) return;
        const outcome = await runIdentityMitmExperiment(aliceIdentity, bobIdentity);
        recordOutcome(outcome);
        setSafetyVerified(false);
        setLastEveNote(outcome.summary);
        pushToast(
            'MITM Warning — Safety Numbers Mismatch',
            'Substituted key blocked by Ed25519 + fingerprint pinning',
            FUSE_DANGER,
            6000,
            true
        );
    };

    const handleModeChange = (next: SecureMode) => {
        if (next === mode) return;
        setMode(next);
        pushToast(
            next === 'AES-256-CBC' ? 'CBC Mode — Unauthenticated' : 'GCM Mode — AEAD Enabled',
            next === 'AES-256-CBC'
                ? 'Confidentiality only: bit-flips corrupt plaintext silently'
                : 'Integrity, authenticity and replay protection enforced',
            next === 'AES-256-CBC' ? FUSE_WARN : FUSE_SECURE,
            4500
        );
    };

    const handleToggleArmed = () => {
        const next = !armed;
        setArmed(next);
        pushToast(
            next ? 'Eve Armed' : 'Eve Cancelled',
            next ? 'Interceptor ready to tamper, replay and spoof' : 'Attack controls disabled',
            next ? FUSE_DANGER : FUSE_WARN,
            3000
        );
    };

    const handleVerifySafety = () => {
        if (!safetyNumber) return;
        setSafetyVerified(true);
        pushToast(
            'Safety Numbers Match',
            'Out-of-band verification succeeded — no MITM detected',
            FUSE_SECURE,
            3500
        );
    };

    const handleCopySafety = async () => {
        if (!safetyNumber) return;
        const formatted = formatSafetyNumber(safetyNumber);
        try {
            await navigator.clipboard?.writeText(formatted);
        } catch {
            /* clipboard may be unavailable on http:// LAN origins */
        }
        pushToast('Copied to Clipboard', formatted, FUSE_SECURE, 3000);
    };

    const handleRekey = async () => {
        await initLabSession(true);
    };

    const handleRunAllExperiments = async () => {
        if (!aliceSession || !bobSession || !aliceIdentity || !bobIdentity) return;
        const results = await runSecureExperimentSuite(
            aliceSession,
            bobSession,
            mode,
            aliceIdentity,
            bobIdentity
        );
        setOutcomes(results);
        setLastEveNote(`All 5 cryptographic experiments completed for ${mode}.`);
        pushToast(
            'Verification Complete',
            `${results.filter((r) => r.passed).length}/5 checks passed · ${mode}`,
            FUSE_SECURE,
            4000
        );
    };

    const handleRunBenchmarks = async () => {
        if (!aliceSession || !bobSession) return;
        setIsBenchmarking(true);
        try {
            const rows = await runSecureBenchmarks(aliceSession, bobSession, mode);
            setBenchmarks(rows);
        } finally {
            setIsBenchmarking(false);
        }
    };

    const handleSelectCapture = (event: CapturedWireEvent) => {
        setSelectedCaptureId(event.id);
        setInspectedPacket(event.packet);
        setLastLatency(undefined);
    };

    const rejectedCount = bobInbox.filter((b) => b.status === 'rejected').length;

    return (
        <div className="flex-1 overflow-y-auto bg-transparent text-[var(--text-primary)] p-4 lg:p-6 space-y-5 relative">
            <div className="relative z-10 space-y-5">
                {/* Compact workstation header */}
                <header className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
                    <div>
                        <div className="flex items-center gap-2">
                            <img src={appLogo} alt="" className="w-5 h-5" />
                            <h1 className="text-base font-bold tracking-tight text-[var(--text-primary)] font-mono">
                                SATURN / CRYPTO LAB
                            </h1>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--accent-secure-dim)] text-[var(--accent-secure)] border border-[var(--accent-secure)]">
                                E2EE ACTIVE
                            </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            Alice ↔ Bob · X25519 · HKDF-SHA256 · AES-256-GCM / AES-256-CBC · Eve intercepts
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                        <GlideSelect<'all' | 'simulation' | 'verify'>
                            value={labTab}
                            onChange={(v) => setLabTab(v)}
                            options={[
                                { value: 'all', label: 'All' },
                                { value: 'simulation', label: 'Alice · Eve · Bob' },
                                { value: 'verify', label: 'Verify & Bench' },
                            ]}
                        />
                        <div className="px-2.5 py-1 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)]">
                            <span className="text-[var(--text-muted)]">Encrypted: </span>
                            <CountUp value={sentMessages.length} className="text-[var(--accent-secure)] font-semibold" />
                        </div>
                        <div className="px-2.5 py-1 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)]">
                            <span className="text-[var(--text-muted)]">Rejected: </span>
                            <CountUp value={rejectedCount} className="text-[var(--accent-danger)] font-semibold" />
                        </div>
                        <button
                            type="button"
                            onClick={() => void initLabSession(false)}
                            className="px-3 py-1.5 rounded bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] border border-[var(--border-strong)] text-xs text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer"
                        >
                            <RotateCcw className="w-3.5 h-3.5 text-[var(--accent-secure)]" />
                            Reset Session
                        </button>
                    </div>
                </header>

                {(labTab === 'all' || labTab === 'simulation') && (
                    <>
                        <SessionSecurityHeader
                            aliceIdentity={aliceIdentity}
                            bobIdentity={bobIdentity}
                            session={aliceSession}
                            mode={mode}
                            onModeChange={handleModeChange}
                            wrongKey={wrongKey}
                            onWrongKeyChange={(value) => {
                                setWrongKey(value);
                                pushToast(
                                    value ? 'Wrong Key Simulation On' : 'Wrong Key Simulation Off',
                                    value
                                        ? 'Bob will decrypt with an independent random key'
                                        : 'Bob decrypts with the negotiated session key',
                                    value ? FUSE_DANGER : FUSE_SECURE,
                                    3500
                                );
                            }}
                            safetyNumber={safetyNumber}
                            safetyVerified={safetyVerified}
                            onVerify={handleVerifySafety}
                            onCopy={() => void handleCopySafety()}
                            onRekey={() => void handleRekey()}
                            disabled={!aliceSession || !bobSession}
                        />

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <AlicePanel
                                identity={aliceIdentity}
                                session={aliceSession}
                                sentMessages={sentMessages}
                                mode={mode}
                                onSendEncrypted={(plaintext) => void handleSendEncrypted(plaintext)}
                                disabled={!aliceSession || !bobSession}
                            />

                            <EveDashboard
                                captureLog={captureLog}
                                selectedCaptureId={selectedCaptureId}
                                onSelectCapture={handleSelectCapture}
                                lastCapturedPacket={inspectedPacket}
                                onPassiveEavesdrop={handlePassiveEavesdrop}
                                onTamperCiphertext={() => void handleTamperCiphertext()}
                                onTamperAAD={() => void handleTamperAAD()}
                                onReplayPacket={() => void handleReplayPacket()}
                                onWrongKeyDecrypt={() => void handleWrongKeyDecrypt()}
                                onMitmIdentityTest={() => void handleMitmIdentity()}
                                onEducationalAesCbc={() =>
                                    handleModeChange(mode === 'AES-256-GCM' ? 'AES-256-CBC' : 'AES-256-GCM')
                                }
                                lastEveNote={lastEveNote}
                                armed={armed}
                                onToggleArmed={handleToggleArmed}
                                mode={mode}
                            />

                            <BobPanel identity={bobIdentity} session={bobSession} inbox={bobInbox} />
                        </div>
                    </>
                )}

                <PacketInspector
                    packet={inspectedPacket}
                    plaintextPreview={lastPlaintext}
                    mode={mode}
                    latencyMs={lastLatency}
                />

                {(labTab === 'all' || labTab === 'verify') && (
                    <SecurityResults
                        outcomes={outcomes}
                        benchmarks={benchmarks}
                        isBenchmarking={isBenchmarking}
                        onRunBenchmarks={() => void handleRunBenchmarks()}
                        onRunAllExperiments={() => void handleRunAllExperiments()}
                        hasPacket={Boolean(inspectedPacket)}
                    />
                )}

                <EncryptionSequencePlayer />
                <HashingLab />

                <footer className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-2 pt-1">
                    <Terminal className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    Demo interface · Cryptographic logic runs independently of UI motion primitives.
                </footer>
            </div>

            <div
                style={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: 10,
                    zIndex: 9999,
                    pointerEvents: 'none',
                }}
            >
                {toasts.map((t) => (
                    <div key={t.id} style={{ pointerEvents: 'auto' }}>
                        <SwipeToast
                            inline
                            open={true}
                            title={t.title}
                            description={t.description}
                            background="#121216"
                            color="#FAFAFA"
                            fuseColor={t.fuseColor}
                            duration={t.duration}
                            closeButton={Boolean(t.closeButton)}
                            pauseOnHover={true}
                            dismissible={true}
                            onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
