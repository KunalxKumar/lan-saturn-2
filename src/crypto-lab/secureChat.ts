import {
    LabSession,
    PeerIdentity,
    ensureCryptoReady,
    exportSessionKeys,
} from './session';
import { fromBase64, toBase64 } from './packet';
import {
    runIdentityMitmExperiment,
    type BenchmarkRow,
    type ExperimentOutcome,
} from './experiments';

export type SecureMode = 'AES-256-GCM' | 'AES-256-CBC';

export const SECURE_PACKET_VERSION = 1 as const;
export const GCM_NONCE_BYTES = 12;
export const GCM_TAG_BYTES = 16;
export const CBC_IV_BYTES = 16;

export interface SecurePacket {
    version: 1;
    session_id: string;
    sender: string;
    receiver: string;
    sequence: number;
    mode: SecureMode;
    nonce: string; // base64 — 96-bit GCM nonce or 128-bit CBC IV
    ciphertext: string; // base64 — ciphertext (+ 16-byte GCM tag)
}

export interface SecureChatSession {
    sessionId: string;
    ownerId: string;
    peerId: string;
    peerFingerprint: string;
    verified: boolean;
    sendSequence: number;
    lastRecvSequence: number;
    seenSequences: Set<number>;
    createdAt: number;
    txKey: Uint8Array;
    rxKey: Uint8Array;
}

interface AesKeySet {
    txGcm: CryptoKey;
    rxGcm: CryptoKey;
    txCbc: CryptoKey;
    rxCbc: CryptoKey;
}

const aesKeyStore = new WeakMap<SecureChatSession, AesKeySet>();

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export class InvalidTagError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidTagError';
    }
}

function subtle(): SubtleCrypto {
    const c = globalThis.crypto?.subtle;
    if (!c) {
        throw new Error('WebCrypto SubtleCrypto is unavailable in this browser context');
    }
    return c;
}

function randomBytes(length: number): Uint8Array {
    return globalThis.crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Wrap an X25519/HKDF LabSession in an AES secure-chat session.
 * The existing XChaCha session stays untouched and its tests keep passing.
 */
export async function createSecureSession(labSession: LabSession): Promise<SecureChatSession> {
    await ensureCryptoReady();
    const keys = exportSessionKeys(labSession);
    if (!keys) {
        throw new Error('Lab session has no derived key material');
    }
    return {
        sessionId: labSession.sessionId,
        ownerId: labSession.ownerId,
        peerId: labSession.peerId,
        peerFingerprint: labSession.peerFingerprint,
        verified: labSession.verified,
        sendSequence: labSession.sendSequence,
        lastRecvSequence: labSession.lastRecvSequence,
        seenSequences: new Set(labSession.seenSequences),
        createdAt: labSession.createdAt,
        txKey: keys.txKey,
        rxKey: keys.rxKey,
    };
}

export function cloneSecureSession(session: SecureChatSession): SecureChatSession {
    return {
        ...session,
        sendSequence: 0,
        lastRecvSequence: 0,
        seenSequences: new Set<number>(),
        txKey: new Uint8Array(session.txKey),
        rxKey: new Uint8Array(session.rxKey),
    };
}

async function getAesKeys(session: SecureChatSession): Promise<AesKeySet> {
    const cached = aesKeyStore.get(session);
    if (cached) return cached;

    const c = subtle();
    const [txGcm, rxGcm, txCbc, rxCbc] = await Promise.all([
        c.importKey('raw', session.txKey as BufferSource, { name: 'AES-GCM' }, false, ['encrypt']),
        c.importKey('raw', session.rxKey as BufferSource, { name: 'AES-GCM' }, false, ['decrypt']),
        c.importKey('raw', session.txKey as BufferSource, { name: 'AES-CBC' }, false, ['encrypt']),
        c.importKey('raw', session.rxKey as BufferSource, { name: 'AES-CBC' }, false, ['decrypt']),
    ]);
    const set: AesKeySet = { txGcm, rxGcm, txCbc, rxCbc };
    aesKeyStore.set(session, set);
    return set;
}

async function importWrongKey(mode: SecureMode): Promise<CryptoKey> {
    const raw = randomBytes(32);
    return subtle().importKey(
        'raw',
        raw as BufferSource,
        { name: mode === 'AES-256-GCM' ? 'AES-GCM' : 'AES-CBC' },
        false,
        ['decrypt']
    );
}

function buildAad(packet: Pick<SecurePacket, 'sender' | 'receiver' | 'sequence'>): Uint8Array {
    return encoder.encode(`${packet.sender}|${packet.receiver}|${packet.sequence}`);
}

export interface EncryptResult {
    packet: SecurePacket;
    latencyMs: number;
}

export async function encryptSecureMessage(
    session: SecureChatSession,
    plaintext: string,
    mode: SecureMode
): Promise<EncryptResult> {
    const keys = await getAesKeys(session);
    const c = subtle();

    session.sendSequence += 1;
    const sequence = session.sendSequence;
    const sender = session.ownerId;
    const receiver = session.peerId;

    const nonce = randomBytes(mode === 'AES-256-GCM' ? GCM_NONCE_BYTES : CBC_IV_BYTES);
    const data = encoder.encode(plaintext);

    const started = performance.now();
    let cipherBuf: ArrayBuffer;
    if (mode === 'AES-256-GCM') {
        cipherBuf = await c.encrypt(
            {
                name: 'AES-GCM',
                iv: nonce as BufferSource,
                additionalData: buildAad({ sender, receiver, sequence }) as BufferSource,
                tagLength: GCM_TAG_BYTES * 8,
            },
            keys.txGcm,
            data as BufferSource
        );
    } else {
        cipherBuf = await c.encrypt(
            { name: 'AES-CBC', iv: nonce as BufferSource },
            keys.txCbc,
            data as BufferSource
        );
    }
    const latencyMs = performance.now() - started;

    const packet: SecurePacket = {
        version: SECURE_PACKET_VERSION,
        session_id: session.sessionId,
        sender,
        receiver,
        sequence,
        mode,
        nonce: toBase64(nonce),
        ciphertext: toBase64(new Uint8Array(cipherBuf)),
    };
    return { packet, latencyMs };
}

export interface DecryptOptions {
    useWrongKey?: boolean;
    bypassReplay?: boolean;
    /** Let a spoofed sender/receiver reach the crypto layer so AAD can be tested. */
    allowSpoofedMetadata?: boolean;
}

export interface DecryptResult {
    plaintext: string;
    latencyMs: number;
    verified: boolean;
    sequence: number;
}

export async function decryptSecureMessage(
    session: SecureChatSession,
    packet: SecurePacket,
    options: DecryptOptions = {}
): Promise<DecryptResult> {
    if (packet.version !== SECURE_PACKET_VERSION) {
        throw new Error(`Unsupported packet version: ${packet.version}`);
    }
    if (packet.session_id !== session.sessionId) {
        throw new Error(`Session mismatch: expected ${session.sessionId}, got ${packet.session_id}`);
    }
    if (
        !options.allowSpoofedMetadata &&
        (packet.sender !== session.peerId || packet.receiver !== session.ownerId)
    ) {
        throw new Error(`Participant mismatch: ${packet.sender} → ${packet.receiver}`);
    }

    if (!options.bypassReplay) {
        if (packet.sequence <= session.lastRecvSequence || session.seenSequences.has(packet.sequence)) {
            throw new Error(
                `Replay detected: sequence #${packet.sequence} already processed (last accepted #${session.lastRecvSequence})`
            );
        }
    }

    const keys = await getAesKeys(session);
    const c = subtle();
    const nonce = fromBase64(packet.nonce);
    const cipher = fromBase64(packet.ciphertext);

    const expectedNonce = packet.mode === 'AES-256-GCM' ? GCM_NONCE_BYTES : CBC_IV_BYTES;
    if (nonce.length !== expectedNonce) {
        throw new Error(`Invalid nonce length: expected ${expectedNonce} bytes, got ${nonce.length}`);
    }

    const key = options.useWrongKey
        ? await importWrongKey(packet.mode)
        : packet.mode === 'AES-256-GCM'
          ? keys.rxGcm
          : keys.rxCbc;

    const started = performance.now();
    let plainBuf: ArrayBuffer;
    try {
        if (packet.mode === 'AES-256-GCM') {
            plainBuf = await c.decrypt(
                {
                    name: 'AES-GCM',
                    iv: nonce as BufferSource,
                    additionalData: buildAad(packet) as BufferSource,
                    tagLength: GCM_TAG_BYTES * 8,
                },
                key,
                cipher as BufferSource
            );
        } else {
            plainBuf = await c.decrypt(
                { name: 'AES-CBC', iv: nonce as BufferSource },
                key,
                cipher as BufferSource
            );
        }
    } catch {
        if (packet.mode === 'AES-256-GCM') {
            throw new InvalidTagError(
                'GCM InvalidTag — ciphertext, nonce, AAD metadata, or session key is invalid'
            );
        }
        throw new Error('AES-CBC padding error — ciphertext was corrupted');
    }
    const latencyMs = performance.now() - started;

    if (!options.bypassReplay) {
        session.lastRecvSequence = packet.sequence;
        session.seenSequences.add(packet.sequence);
    }

    return {
        plaintext: decoder.decode(plainBuf),
        latencyMs,
        verified: packet.mode === 'AES-256-GCM',
        sequence: packet.sequence,
    };
}

export function tamperSecurePacket(
    packet: SecurePacket,
    target: 'ciphertext' | 'nonce' | 'aad' = 'ciphertext'
): SecurePacket {
    const clone: SecurePacket = { ...packet };
    if (target === 'ciphertext') {
        const bytes = fromBase64(clone.ciphertext);
        bytes[0] = bytes[0] ^ 0x01;
        clone.ciphertext = toBase64(bytes);
    } else if (target === 'nonce') {
        const bytes = fromBase64(clone.nonce);
        bytes[0] = bytes[0] ^ 0x01;
        clone.nonce = toBase64(bytes);
    } else if (target === 'aad') {
        clone.sender = `${clone.sender}-spoofed`;
    }
    return clone;
}

/* ------------------------------------------------------------------ */
/* Safety numbers (SHA-256, 12 decimal digits, order independent)      */
/* ------------------------------------------------------------------ */

export async function computeSafetyNumber(a: PeerIdentity, b: PeerIdentity): Promise<string> {
    const keyA = Array.from(a.ed25519PublicKey);
    const keyB = Array.from(b.ed25519PublicKey);
    const [first, second] =
        keyA.join(',').localeCompare(keyB.join(',')) <= 0 ? [keyA, keyB] : [keyB, keyA];

    const combined = new Uint8Array(first.length + second.length);
    combined.set(first, 0);
    combined.set(second, first.length);

    const digest = new Uint8Array(await subtle().digest('SHA-256', combined as BufferSource));
    return Array.from(digest.slice(0, 12))
        .map((byte) => String(byte % 10))
        .join('');
}

export function formatSafetyNumber(value: string): string {
    return value.replace(/(.{3})/g, '$1 ').trim();
}

export function safetyNumbersMatch(a: string, b: string): boolean {
    return a.length > 0 && a.replace(/\s/g, '') === b.replace(/\s/g, '');
}

/* ------------------------------------------------------------------ */
/* Verification experiments (AES-256-GCM vs AES-256-CBC)               */
/* ------------------------------------------------------------------ */

export async function runSecureTamperExperiment(
    sender: SecureChatSession,
    receiver: SecureChatSession,
    mode: SecureMode
): Promise<ExperimentOutcome> {
    const { packet } = await encryptSecureMessage(
        sender,
        'Integrity check: transfer 100 USD to Bob',
        mode
    );
    const tampered = tamperSecurePacket(packet, 'ciphertext');

    try {
        const result = await decryptSecureMessage(receiver, tampered, { bypassReplay: true });
        if (mode === 'AES-256-CBC') {
            return {
                id: 'aes-tamper-cbc',
                name: 'Ciphertext Tampering (AES-256-CBC)',
                passed: true,
                securityProperty: 'Integrity — absent',
                summary: 'Tampered CBC ciphertext was accepted and plaintext was silently corrupted.',
                details: `Corrupted output: "${result.plaintext}"`,
            };
        }
        return {
            id: 'aes-tamper-gcm',
            name: 'Ciphertext Tampering (AES-256-GCM)',
            passed: false,
            securityProperty: 'Integrity & Authenticity',
            summary: 'ERROR: tampered GCM packet was accepted.',
            details: 'InvalidTag was not raised.',
        };
    } catch (err: any) {
        return {
            id: 'aes-tamper-gcm',
            name: 'Ciphertext Tampering (AES-256-GCM)',
            passed: true,
            securityProperty: 'Integrity & Authenticity',
            summary: 'Tampered GCM packet rejected with InvalidTag.',
            details: err?.message || 'Authentication failed',
        };
    }
}

export async function runSecureReplayExperiment(
    sender: SecureChatSession,
    receiver: SecureChatSession,
    mode: SecureMode
): Promise<ExperimentOutcome> {
    const { packet } = await encryptSecureMessage(sender, 'Replay probe payload', mode);
    try {
        await decryptSecureMessage(receiver, packet);
        try {
            await decryptSecureMessage(receiver, packet);
            return {
                id: 'aes-replay',
                name: 'Replay Attack',
                passed: false,
                securityProperty: 'Replay Protection',
                summary: 'ERROR: replayed packet was accepted twice.',
                details: `Sequence #${packet.sequence} accepted twice.`,
            };
        } catch (err: any) {
            return {
                id: 'aes-replay',
                name: 'Replay Attack',
                passed: true,
                securityProperty: 'Replay Protection',
                summary: 'Replayed packet rejected by monotonic sequence tracking.',
                details: err?.message || 'Replay detected',
            };
        }
    } catch (err: any) {
        return {
            id: 'aes-replay',
            name: 'Replay Attack',
            passed: false,
            securityProperty: 'Replay Protection',
            summary: 'Could not establish the baseline packet for the replay test.',
            details: err?.message || 'Baseline decryption failed',
        };
    }
}

export async function runSecureWrongKeyExperiment(
    sender: SecureChatSession,
    receiver: SecureChatSession,
    mode: SecureMode
): Promise<ExperimentOutcome> {
    const { packet } = await encryptSecureMessage(sender, 'Wrong-key probe payload', mode);
    try {
        const result = await decryptSecureMessage(receiver, packet, {
            useWrongKey: true,
            bypassReplay: true,
        });
        return {
            id: 'aes-wrong-key',
            name: 'Wrong-Key Decryption',
            passed: mode === 'AES-256-CBC',
            securityProperty: mode === 'AES-256-CBC' ? 'Key Separation — absent' : 'Key Separation',
            summary:
                mode === 'AES-256-CBC'
                    ? 'Wrong key produced garbage without any authentication error (CBC has no MAC).'
                    : 'ERROR: wrong 256-bit key decrypted the packet.',
            details: `Garbage output: "${result.plaintext}"`,
        };
    } catch (err: any) {
        return {
            id: 'aes-wrong-key',
            name: 'Wrong-Key Decryption',
            passed: true,
            securityProperty: mode === 'AES-256-GCM' ? 'Key Separation' : 'Key Separation — padding only',
            summary:
                mode === 'AES-256-GCM'
                    ? 'Wrong 256-bit key rejected with zero plaintext exposure.'
                    : 'CBC rejected the packet only by a padding accident, not by authentication.',
            details: err?.message || 'Decryption failed',
        };
    }
}

export async function runSecureExperimentSuite(
    alice: SecureChatSession,
    bob: SecureChatSession,
    mode: SecureMode,
    aliceIdentity: PeerIdentity,
    bobIdentity: PeerIdentity
): Promise<ExperimentOutcome[]> {
    const sender = cloneSecureSession(alice);
    const receiver = cloneSecureSession(bob);

    const { packet: probe } = await encryptSecureMessage(sender, 'secret-transfer-payload', mode);
    const wire = JSON.stringify(probe);
    const passive: ExperimentOutcome = {
        id: 'aes-passive',
        name: 'Passive Eavesdropping',
        passed: !wire.includes('secret-transfer-payload'),
        securityProperty: 'Confidentiality',
        summary:
            'Ciphertext, nonce and metadata are visible on the wire; the plaintext is absent.',
        details: `${wire.length}B ${mode} packet · seq #${probe.sequence} · zero key material exposed`,
    };

    const tamper = await runSecureTamperExperiment(sender, receiver, mode);
    const replay = await runSecureReplayExperiment(sender, receiver, mode);
    const wrongKey = await runSecureWrongKeyExperiment(sender, receiver, mode);
    const mitm = await runIdentityMitmExperiment(aliceIdentity, bobIdentity);

    return [passive, tamper, replay, wrongKey, mitm];
}

/* ------------------------------------------------------------------ */
/* Benchmarks                                                          */
/* ------------------------------------------------------------------ */

function percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
    return Number(sorted[idx].toFixed(4));
}

export async function runSecureBenchmarks(
    alice: SecureChatSession,
    bob: SecureChatSession,
    mode: SecureMode
): Promise<BenchmarkRow[]> {
    const sender = cloneSecureSession(alice);
    const receiver = cloneSecureSession(bob);

    const cases = [
        { label: '128 B', size: 128, iterations: 150 },
        { label: '1 KB', size: 1024, iterations: 150 },
        { label: '10 KB', size: 10 * 1024, iterations: 100 },
        { label: '1 MB', size: 1024 * 1024, iterations: 20 },
    ];

    // Warm-up so key import / JIT costs do not skew the first row.
    const warm = await encryptSecureMessage(sender, 'warmup', mode);
    await decryptSecureMessage(receiver, warm.packet);

    const rows: BenchmarkRow[] = [];
    for (const testCase of cases) {
        const payload = 'A'.repeat(testCase.size);
        const encTimes: number[] = [];
        const decTimes: number[] = [];

        for (let i = 0; i < testCase.iterations; i++) {
            const enc = await encryptSecureMessage(sender, payload, mode);
            const dec = await decryptSecureMessage(receiver, enc.packet);
            encTimes.push(enc.latencyMs);
            decTimes.push(dec.latencyMs);
        }

        encTimes.sort((a, b) => a - b);
        decTimes.sort((a, b) => a - b);

        const nonceBytes = mode === 'AES-256-GCM' ? GCM_NONCE_BYTES : CBC_IV_BYTES;
        const tagBytes = mode === 'AES-256-GCM' ? GCM_TAG_BYTES : 0;
        const paddingBytes = mode === 'AES-256-GCM' ? 0 : 16;
        const overhead = (((nonceBytes + tagBytes + paddingBytes) / testCase.size) * 100).toFixed(2);

        rows.push({
            sizeLabel: testCase.label,
            plaintextBytes: testCase.size,
            nonceBytes,
            tagBytes,
            totalRawEncryptedBytes: testCase.size + nonceBytes + tagBytes + paddingBytes,
            overheadPercent: `${overhead}%`,
            iterations: testCase.iterations,
            encryptMedianMs: percentile(encTimes, 50),
            encryptP95Ms: percentile(encTimes, 95),
            decryptMedianMs: percentile(decTimes, 50),
            decryptP95Ms: percentile(decTimes, 95),
        });
    }

    return rows;
}
