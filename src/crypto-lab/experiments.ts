import sodium from 'libsodium-wrappers-sumo';
import {
    AEAD_NONCE_BYTES,
    AEAD_TAG_BYTES,
    EncryptedPacket,
    fromBase64,
    toBase64,
} from './packet';
import {
    LabSession,
    PeerIdentity,
    createIdentity,
    createSignedHandshake,
    decryptAesCbcEducational,
    decryptPacket,
    encryptAesCbcEducational,
    encryptPacket,
    ensureCryptoReady,
    establishVerifiedSession,
    generateRandom256BitKey,
} from './session';

export interface ExperimentOutcome {
    id: string;
    name: string;
    passed: boolean;
    securityProperty: string;
    summary: string;
    details: string;
}

export function tamperPacketByte(packet: EncryptedPacket, target: 'ciphertext' | 'nonce' | 'aad' = 'ciphertext'): EncryptedPacket {
    const clone: EncryptedPacket = { ...packet };
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

export async function runPassiveEavesdropExperiment(packet: EncryptedPacket, originalPlaintext: string): Promise<ExperimentOutcome> {
    const rawJson = JSON.stringify(packet);
    const leaked = originalPlaintext.length > 0 && rawJson.toLowerCase().includes(originalPlaintext.toLowerCase());
    return {
        id: 'exp-1',
        name: 'Experiment 1: Passive Eavesdropping',
        passed: !leaked,
        securityProperty: 'Confidentiality',
        summary: !leaked
            ? 'Confidentiality holds: ciphertext & nonce visible; plaintext absent from wire packet.'
            : 'Plaintext detected in packet!',
        details: `Captured ${rawJson.length}B packet (nonce=${AEAD_NONCE_BYTES}B, tag=${AEAD_TAG_BYTES}B, seq=#${packet.sequence}).`,
    };
}

export function runTamperingExperiment(bobSession: LabSession, packet: EncryptedPacket): ExperimentOutcome {
    const tampered = tamperPacketByte(packet, 'ciphertext');
    try {
        decryptPacket(bobSession, tampered);
        return {
            id: 'exp-2',
            name: 'Experiment 2: Ciphertext Tampering',
            passed: false,
            securityProperty: 'Integrity & Authenticity',
            summary: 'ERROR: Tampered packet was accepted!',
            details: 'Poly1305 failed to reject modified ciphertext.',
        };
    } catch (err: any) {
        return {
            id: 'exp-2',
            name: 'Experiment 2: Ciphertext Tampering',
            passed: true,
            securityProperty: 'Integrity & Authenticity',
            summary: 'Tampered packet rejected by Poly1305 authentication tag.',
            details: err?.message || 'Authentication failed',
        };
    }
}

export function runReplayExperiment(bobSession: LabSession, alreadyProcessedPacket: EncryptedPacket): ExperimentOutcome {
    try {
        decryptPacket(bobSession, alreadyProcessedPacket);
        return {
            id: 'exp-3',
            name: 'Experiment 3: Replay Attack',
            passed: false,
            securityProperty: 'Replay Protection',
            summary: 'ERROR: Replayed packet was accepted!',
            details: `Sequence #${alreadyProcessedPacket.sequence} was accepted twice.`,
        };
    } catch (err: any) {
        return {
            id: 'exp-3',
            name: 'Experiment 3: Replay Attack',
            passed: true,
            securityProperty: 'Replay Protection',
            summary: 'Replayed packet rejected using monotonic sequence tracking.',
            details: err?.message || 'Replay detected',
        };
    }
}

export function runWrongKeyExperiment(bobSession: LabSession, packet: EncryptedPacket): ExperimentOutcome {
    const wrongKey = generateRandom256BitKey();
    try {
        decryptPacket(bobSession, packet, wrongKey);
        return {
            id: 'exp-4',
            name: 'Experiment 4: Wrong-Key Decryption',
            passed: false,
            securityProperty: 'Key Separation',
            summary: 'ERROR: Wrong 256-bit key decrypted the packet!',
            details: 'Expected authentication failure.',
        };
    } catch (err: any) {
        return {
            id: 'exp-4',
            name: 'Experiment 4: Wrong-Key Decryption',
            passed: true,
            securityProperty: 'Key Separation',
            summary: 'Wrong 256-bit key rejected cleanly with zero plaintext exposure.',
            details: err?.message || 'Decryption failed',
        };
    }
}

export async function runIdentityMitmExperiment(
    aliceIdentity: PeerIdentity,
    bobIdentity: PeerIdentity
): Promise<ExperimentOutcome> {
    const eveIdentity = await createIdentity('eve', 'Eve (MITM)');
    const sessionId = `mitm-test-${Date.now()}`;
    const aliceHs = await createSignedHandshake(aliceIdentity, sessionId);
    const eveHs = await createSignedHandshake(eveIdentity, sessionId);

    // Scenario: Eve intercepts Bob's bundle and substitutes her own X25519/Ed25519 bundle
    // Alice verifies against Bob's pinned fingerprint
    try {
        await establishVerifiedSession({
            localIdentity: aliceIdentity,
            localEphemeral: aliceHs.ephemeral,
            remoteBundle: eveHs.bundle,
            expectedPeerFingerprint: bobIdentity.fingerprint,
            isInitiator: true,
            initiatorId: aliceIdentity.id,
            responderId: bobIdentity.id,
        });
        return {
            id: 'exp-5',
            name: 'Experiment 5: Identity Verification (MITM)',
            passed: false,
            securityProperty: 'Peer Authentication',
            summary: 'ERROR: Substituted key accepted!',
            details: 'Expected fingerprint mismatch.',
        };
    } catch (err: any) {
        return {
            id: 'exp-5',
            name: 'Experiment 5: Identity Verification (MITM)',
            passed: true,
            securityProperty: 'Peer Authentication',
            summary: 'MITM key substitution blocked by Ed25519 + fingerprint verification.',
            details: err?.message || 'Fingerprint mismatch',
        };
    }
}

export async function runEducationalAesCbcComparison(): Promise<{
    tamperResult: string;
    explanation: string;
}> {
    const sample = 'Transfer $100 to Bob — authenticated vs unauthenticated test';
    const { iv, ciphertext, rawKey } = await encryptAesCbcEducational(sample);
    const bytes = fromBase64(ciphertext);
    // Flip a byte in the first block (affects plaintext in block 2 via CBC chaining without padding error)
    bytes[0] = bytes[0] ^ 0x0f;
    const tamperedB64 = toBase64(bytes);

    try {
        const corruptedPlaintext = await decryptAesCbcEducational(tamperedB64, iv, rawKey);
        return {
            tamperResult: `SILENT CORRUPTION (Accepted without error): "${corruptedPlaintext}"`,
            explanation:
                'Unauthenticated AES-CBC has no MAC/tag. Modifying block 1 silently corrupts block 2 plaintext instead of rejecting the packet (unless the final padding block is broken).',
        };
    } catch {
        return {
            tamperResult: 'Padding error on final block — still lacks cryptographic authentication!',
            explanation:
                'Even when AES-CBC throws a padding error, it leaks a padding oracle and provides zero sender/metadata integrity compared to XChaCha20-Poly1305 AEAD.',
        };
    }
}

export interface BenchmarkRow {
    sizeLabel: string;
    plaintextBytes: number;
    nonceBytes: number;
    tagBytes: number;
    totalRawEncryptedBytes: number;
    overheadPercent: string;
    iterations: number;
    encryptMedianMs: number;
    encryptP95Ms: number;
    decryptMedianMs: number;
    decryptP95Ms: number;
}

function percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
    return Number(sorted[idx].toFixed(4));
}

export async function runPerformanceBenchmarks(
    aliceSession: LabSession,
    bobSession: LabSession
): Promise<BenchmarkRow[]> {
    await ensureCryptoReady();
    const cases = [
        { label: '128 B', size: 128, iterations: 200 },
        { label: '1 KB', size: 1024, iterations: 200 },
        { label: '10 KB', size: 10 * 1024, iterations: 150 },
        { label: '1 MB', size: 1024 * 1024, iterations: 25 },
    ];

    // Warm-up
    const warmupPkt = encryptPacket(aliceSession, 'warmup');
    decryptPacket(bobSession, warmupPkt);

    const results: BenchmarkRow[] = [];

    for (const c of cases) {
        const payload = 'A'.repeat(c.size);
        const encTimes: number[] = [];
        const decTimes: number[] = [];

        for (let i = 0; i < c.iterations; i++) {
            const t0 = performance.now();
            const pkt = encryptPacket(aliceSession, payload);
            const t1 = performance.now();
            decryptPacket(bobSession, pkt);
            const t2 = performance.now();

            encTimes.push(t1 - t0);
            decTimes.push(t2 - t1);
        }

        encTimes.sort((a, b) => a - b);
        decTimes.sort((a, b) => a - b);

        const totalRaw = c.size + AEAD_NONCE_BYTES + AEAD_TAG_BYTES;
        const overhead = (((AEAD_NONCE_BYTES + AEAD_TAG_BYTES) / c.size) * 100).toFixed(2);

        results.push({
            sizeLabel: c.label,
            plaintextBytes: c.size,
            nonceBytes: AEAD_NONCE_BYTES,
            tagBytes: AEAD_TAG_BYTES,
            totalRawEncryptedBytes: totalRaw,
            overheadPercent: `${overhead}%`,
            iterations: c.iterations,
            encryptMedianMs: percentile(encTimes, 50),
            encryptP95Ms: percentile(encTimes, 95),
            decryptMedianMs: percentile(decTimes, 50),
            decryptP95Ms: percentile(decTimes, 95),
        });
    }

    // Ensure sodium reference stays used
    void sodium;
    return results;
}
