import { describe, expect, it } from 'vitest';
import {
    createIdentity,
    createSignedHandshake,
    decryptPacket,
    encryptPacket,
    establishVerifiedSession,
    generateRandom256BitKey,
} from '../../src/crypto-lab/session';
import { fromBase64, toBase64 } from '../../src/crypto-lab/packet';
import {
    runEducationalAesCbcComparison,
    runIdentityMitmExperiment,
    runPerformanceBenchmarks,
    tamperPacketByte,
} from '../../src/crypto-lab/experiments';

async function setupVerifiedPair(sessionId = `test-session-${Date.now()}`) {
    const alice = await createIdentity('alice', 'Alice');
    const bob = await createIdentity('bob', 'Bob');
    const aliceHs = await createSignedHandshake(alice, sessionId);
    const bobHs = await createSignedHandshake(bob, sessionId);

    const aliceSession = await establishVerifiedSession({
        localIdentity: alice,
        localEphemeral: aliceHs.ephemeral,
        remoteBundle: bobHs.bundle,
        expectedPeerFingerprint: bob.fingerprint,
        isInitiator: true,
        initiatorId: alice.id,
        responderId: bob.id,
    });

    const bobSession = await establishVerifiedSession({
        localIdentity: bob,
        localEphemeral: bobHs.ephemeral,
        remoteBundle: aliceHs.bundle,
        expectedPeerFingerprint: alice.fingerprint,
        isInitiator: false,
        initiatorId: alice.id,
        responderId: bob.id,
    });

    return { alice, bob, aliceSession, bobSession };
}

describe('LAN Saturn Crypto Lab — Security Verification Matrix', () => {
    it('1. Correct key decrypts message (PASS)', async () => {
        const { aliceSession, bobSession } = await setupVerifiedPair();
        const pkt = encryptPacket(aliceSession, 'Hello Bob — verified E2EE!');
        const res = decryptPacket(bobSession, pkt);
        expect(res.plaintext).toBe('Hello Bob — verified E2EE!');
        expect(res.verifiedAAD).toBe(true);
        expect(res.sequence).toBe(1);
    });

    it('2. Wrong key fails (Rejected)', async () => {
        const { aliceSession, bobSession } = await setupVerifiedPair();
        const pkt = encryptPacket(aliceSession, 'Secret payload');
        const wrongKey = generateRandom256BitKey();
        expect(() => decryptPacket(bobSession, pkt, wrongKey)).toThrow(/Authentication tag verification failed/);
    });

    it('3. Ciphertext changed (Rejected)', async () => {
        const { aliceSession, bobSession } = await setupVerifiedPair();
        const pkt = encryptPacket(aliceSession, 'Integrity test message');
        const tampered = tamperPacketByte(pkt, 'ciphertext');
        expect(() => decryptPacket(bobSession, tampered)).toThrow(/Authentication tag verification failed/);
    });

    it('4. Authentication tag changed (Rejected)', async () => {
        const { aliceSession, bobSession } = await setupVerifiedPair();
        const pkt = encryptPacket(aliceSession, 'Tag tamper test');
        const bytes = fromBase64(pkt.ciphertext);
        bytes[bytes.length - 1] ^= 0xff; // Flip last byte of 16-byte Poly1305 tag
        const tampered = { ...pkt, ciphertext: toBase64(bytes) };
        expect(() => decryptPacket(bobSession, tampered)).toThrow(/Authentication tag verification failed/);
    });

    it('5. Nonce changed (Rejected)', async () => {
        const { aliceSession, bobSession } = await setupVerifiedPair();
        const pkt = encryptPacket(aliceSession, 'Nonce tamper test');
        const tampered = tamperPacketByte(pkt, 'nonce');
        expect(() => decryptPacket(bobSession, tampered)).toThrow(/Authentication tag verification failed/);
    });

    it('6. AAD changed (Rejected)', async () => {
        const { aliceSession, bobSession } = await setupVerifiedPair();
        const pkt = encryptPacket(aliceSession, 'AAD binding test');
        // Tamper sequence number in AAD (sender/receiver/session_id also checked)
        const tamperedSeq = { ...pkt, sequence: 99 };
        expect(() => decryptPacket(bobSession, tamperedSeq)).toThrow(/Authentication tag verification failed/);
    });

    it('7. Replay captured packet (Rejected)', async () => {
        const { aliceSession, bobSession } = await setupVerifiedPair();
        const pkt = encryptPacket(aliceSession, 'One-time transfer #1');
        expect(decryptPacket(bobSession, pkt).plaintext).toBe('One-time transfer #1');
        expect(() => decryptPacket(bobSession, pkt)).toThrow(/Replay detected/);
    });

    it('8. Verified identity mismatch / MITM key substitution (Rejected)', async () => {
        const { alice, bob } = await setupVerifiedPair();
        const outcome = await runIdentityMitmExperiment(alice, bob);
        expect(outcome.passed).toBe(true);
    });

    it('9. Empty message (Correctly processed)', async () => {
        const { aliceSession, bobSession } = await setupVerifiedPair();
        const pkt = encryptPacket(aliceSession, '');
        const res = decryptPacket(bobSession, pkt);
        expect(res.plaintext).toBe('');
    });

    it('10. Large message (128 KB correctly processed)', async () => {
        const { aliceSession, bobSession } = await setupVerifiedPair();
        const largeText = 'X'.repeat(128 * 1024);
        const pkt = encryptPacket(aliceSession, largeText);
        const res = decryptPacket(bobSession, pkt);
        expect(res.plaintext.length).toBe(128 * 1024);
        expect(res.plaintext).toBe(largeText);
    });

    it('11. New session after reconnection rejects stale packets from old session', async () => {
        const pair1 = await setupVerifiedPair('session-old');
        const pair2 = await setupVerifiedPair('session-new');
        const oldPacket = encryptPacket(pair1.aliceSession, 'Stale session message');
        expect(() => decryptPacket(pair2.bobSession, oldPacket)).toThrow(/Session mismatch/);
    });

    it('12. Encryption performance measured & educational AES-CBC comparison works', async () => {
        const { aliceSession, bobSession } = await setupVerifiedPair();
        const bench = await runPerformanceBenchmarks(aliceSession, bobSession);
        expect(bench.length).toBe(4);
        expect(bench[0].sizeLabel).toBe('128 B');
        expect(bench[0].encryptMedianMs).toBeGreaterThanOrEqual(0);

        const cbcDemo = await runEducationalAesCbcComparison();
        expect(cbcDemo.tamperResult.length).toBeGreaterThan(0);
    });
});
