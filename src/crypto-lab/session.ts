import sodium from 'libsodium-wrappers-sumo';
import {
    AEAD_ALGORITHM,
    AEAD_NONCE_BYTES,
    EncryptedPacket,
    PACKET_VERSION,
    extractPacketMetadata,
    fromBase64,
    serializePacketAAD,
    toBase64,
} from './packet';

export interface PeerIdentity {
    id: string;
    displayName: string;
    ed25519PublicKey: Uint8Array;
    fingerprint: string;
}

interface IdentitySecrets {
    ed25519PrivateKey: Uint8Array;
}

export interface SignedHandshakeBundle {
    senderId: string;
    sessionId: string;
    x25519PublicKey: Uint8Array;
    ed25519PublicKey: Uint8Array;
    signature: Uint8Array;
}

export interface LabSession {
    sessionId: string;
    ownerId: string;
    peerId: string;
    peerFingerprint: string;
    verified: boolean;
    sendSequence: number;
    lastRecvSequence: number;
    seenSequences: Set<number>;
    createdAt: number;
}

interface SessionKeyMaterial {
    txKey: Uint8Array;
    rxKey: Uint8Array;
}

// Keep raw secret key material out of inspectable state/logs
const identitySecretStore = new WeakMap<PeerIdentity, IdentitySecrets>();
const sessionKeyStore = new WeakMap<LabSession, SessionKeyMaterial>();

export async function ensureCryptoReady(): Promise<void> {
    await sodium.ready;
}

export function computeFingerprint(publicKey: Uint8Array): string {
    const hash = sodium.crypto_generichash(16, publicKey, null);
    return Array.from(hash)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(':')
        .replace(/(.{11}):(.{11}):(.{11}):(.{11})/, '$1 $2 $3 $4');
}

export async function createIdentity(id: string, displayName: string): Promise<PeerIdentity> {
    await ensureCryptoReady();
    const kp = sodium.crypto_sign_keypair();
    const identity: PeerIdentity = {
        id,
        displayName,
        ed25519PublicKey: kp.publicKey,
        fingerprint: computeFingerprint(kp.publicKey),
    };
    identitySecretStore.set(identity, { ed25519PrivateKey: kp.privateKey });
    return identity;
}

export interface EphemeralKeyPair {
    publicKey: Uint8Array;
    privateKey: Uint8Array;
}

export async function createSignedHandshake(
    identity: PeerIdentity,
    sessionId: string
): Promise<{ bundle: SignedHandshakeBundle; ephemeral: EphemeralKeyPair }> {
    await ensureCryptoReady();
    const secrets = identitySecretStore.get(identity);
    if (!secrets) {
        throw new Error(`Missing private identity material for ${identity.id}`);
    }

    const ephemeral = sodium.crypto_kx_keypair();
    const payload = buildHandshakeTranscript(identity.id, sessionId, ephemeral.publicKey);
    const signature = sodium.crypto_sign_detached(payload, secrets.ed25519PrivateKey);

    return {
        bundle: {
            senderId: identity.id,
            sessionId,
            x25519PublicKey: ephemeral.publicKey,
            ed25519PublicKey: identity.ed25519PublicKey,
            signature,
        },
        ephemeral: {
            publicKey: ephemeral.publicKey,
            privateKey: ephemeral.privateKey,
        },
    };
}

function buildHandshakeTranscript(
    senderId: string,
    sessionId: string,
    x25519PublicKey: Uint8Array
): Uint8Array {
    return sodium.from_string(
        `lan-saturn-handshake-v1|${senderId}|${sessionId}|${toBase64(x25519PublicKey)}`
    );
}

/**
 * Derive directional 256-bit keys using HKDF-SHA256.
 */
async function deriveSessionKeysHKDF(
    sharedSecret: Uint8Array,
    sessionId: string,
    initiatorId: string,
    responderId: string,
    isInitiator: boolean
): Promise<SessionKeyMaterial> {
    const subtle = globalThis.crypto.subtle;
    const ikm = await subtle.importKey(
        'raw',
        sharedSecret as BufferSource,
        'HKDF',
        false,
        ['deriveBits']
    );

    const salt = sodium.from_string(`lan-saturn-hkdf-salt-v1:${sessionId}`);
    const infoAtoB = sodium.from_string(`lan-saturn-tx:${initiatorId}->${responderId}:${sessionId}`);
    const infoBtoA = sodium.from_string(`lan-saturn-tx:${responderId}->${initiatorId}:${sessionId}`);

    const [bitsAtoB, bitsBtoA] = await Promise.all([
        subtle.deriveBits(
            { name: 'HKDF', hash: 'SHA-256', salt: salt as BufferSource, info: infoAtoB as BufferSource },
            ikm,
            256
        ),
        subtle.deriveBits(
            { name: 'HKDF', hash: 'SHA-256', salt: salt as BufferSource, info: infoBtoA as BufferSource },
            ikm,
            256
        ),
    ]);

    const keyAtoB = new Uint8Array(bitsAtoB);
    const keyBtoA = new Uint8Array(bitsBtoA);

    return isInitiator
        ? { txKey: keyAtoB, rxKey: keyBtoA }
        : { txKey: keyBtoA, rxKey: keyAtoB };
}

export async function establishVerifiedSession(params: {
    localIdentity: PeerIdentity;
    localEphemeral: EphemeralKeyPair;
    remoteBundle: SignedHandshakeBundle;
    expectedPeerFingerprint?: string;
    isInitiator: boolean;
    initiatorId: string;
    responderId: string;
}): Promise<LabSession> {
    await ensureCryptoReady();
    const {
        localIdentity,
        localEphemeral,
        remoteBundle,
        expectedPeerFingerprint,
        isInitiator,
        initiatorId,
        responderId,
    } = params;

    // 1. Verify Ed25519 signature on ephemeral X25519 key
    const transcript = buildHandshakeTranscript(
        remoteBundle.senderId,
        remoteBundle.sessionId,
        remoteBundle.x25519PublicKey
    );
    const sigValid = sodium.crypto_sign_verify_detached(
        remoteBundle.signature,
        transcript,
        remoteBundle.ed25519PublicKey
    );
    if (!sigValid) {
        throw new Error('Authentication failed: Invalid Ed25519 handshake signature (possible MITM tampering)');
    }

    // 2. Verify pinned identity key / fingerprint if provided
    const actualFingerprint = computeFingerprint(remoteBundle.ed25519PublicKey);
    if (expectedPeerFingerprint && actualFingerprint !== expectedPeerFingerprint) {
        throw new Error(
            `Identity verification failed: Fingerprint mismatch! Expected ${expectedPeerFingerprint}, got ${actualFingerprint}`
        );
    }

    // 3. Compute X25519 shared secret (scalar multiplication)
    const sharedSecret = sodium.crypto_scalarmult(
        localEphemeral.privateKey,
        remoteBundle.x25519PublicKey
    );

    // 4. Derive separate directional tx/rx keys with HKDF-SHA256
    const keys = await deriveSessionKeysHKDF(
        sharedSecret,
        remoteBundle.sessionId,
        initiatorId,
        responderId,
        isInitiator
    );

    // Zeroize temporary shared secret
    sodium.memzero(sharedSecret);

    const session: LabSession = {
        sessionId: remoteBundle.sessionId,
        ownerId: localIdentity.id,
        peerId: remoteBundle.senderId,
        peerFingerprint: actualFingerprint,
        verified: true,
        sendSequence: 0,
        lastRecvSequence: 0,
        seenSequences: new Set<number>(),
        createdAt: Date.now(),
    };
    sessionKeyStore.set(session, keys);
    return session;
}

export function encryptPacket(session: LabSession, plaintext: string): EncryptedPacket {
    const keys = sessionKeyStore.get(session);
    if (!keys) {
        throw new Error('Session has no active key material');
    }

    session.sendSequence += 1;
    const sequence = session.sendSequence;

    const meta = {
        version: PACKET_VERSION,
        session_id: session.sessionId,
        sender: session.ownerId,
        receiver: session.peerId,
        sequence,
        algorithm: AEAD_ALGORITHM,
    } as const;

    const aad = serializePacketAAD(meta);
    const nonce = sodium.randombytes_buf(AEAD_NONCE_BYTES);
    const plaintextBytes = sodium.from_string(plaintext);

    const cipherBytes = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
        plaintextBytes,
        aad,
        null,
        nonce,
        keys.txKey
    );

    return {
        ...meta,
        nonce: toBase64(nonce),
        ciphertext: toBase64(cipherBytes),
    };
}

export interface DecryptResult {
    plaintext: string;
    sequence: number;
    verifiedAAD: boolean;
}

export function decryptPacket(
    session: LabSession,
    packet: EncryptedPacket,
    overrideKey?: Uint8Array
): DecryptResult {
    const keys = sessionKeyStore.get(session);
    if (!keys && !overrideKey) {
        throw new Error('Session has no active key material');
    }

    if (packet.version !== PACKET_VERSION || packet.algorithm !== AEAD_ALGORITHM) {
        throw new Error(`Unsupported packet version or algorithm: v${packet.version} ${packet.algorithm}`);
    }

    if (packet.session_id !== session.sessionId) {
        throw new Error(`Session mismatch: expected ${session.sessionId}, got ${packet.session_id}`);
    }

    if (packet.sender !== session.peerId || packet.receiver !== session.ownerId) {
        throw new Error(`Participant mismatch: ${packet.sender} -> ${packet.receiver}`);
    }

    // Replay protection check (only enforced for normal session decryption, not wrong-key demo)
    if (!overrideKey) {
        if (packet.sequence <= session.lastRecvSequence || session.seenSequences.has(packet.sequence)) {
            throw new Error(
                `Replay detected: sequence #${packet.sequence} already processed (last accepted #${session.lastRecvSequence})`
            );
        }
    }

    const aad = serializePacketAAD(extractPacketMetadata(packet));
    const nonceBytes = fromBase64(packet.nonce);
    const cipherBytes = fromBase64(packet.ciphertext);
    const keyToUse = overrideKey || keys!.rxKey;

    if (nonceBytes.length !== AEAD_NONCE_BYTES) {
        throw new Error(`Invalid nonce length: expected ${AEAD_NONCE_BYTES} bytes, got ${nonceBytes.length}`);
    }

    let plainBytes: Uint8Array;
    try {
        plainBytes = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
            null,
            cipherBytes,
            aad,
            nonceBytes,
            keyToUse
        );
    } catch {
        throw new Error('Authentication tag verification failed (ciphertext, tag, nonce, AAD, or key invalid)');
    }

    // Update replay state strictly AFTER authentication succeeds
    if (!overrideKey) {
        session.lastRecvSequence = packet.sequence;
        session.seenSequences.add(packet.sequence);
    }

    return {
        plaintext: sodium.to_string(plainBytes),
        sequence: packet.sequence,
        verifiedAAD: true,
    };
}

/**
 * Read-only accessor for the directional session keys.
 * Returns copies so callers (e.g. the AES-256 secure chat layer) cannot
 * mutate the key material held by the XChaCha session.
 */
export function exportSessionKeys(session: LabSession): { txKey: Uint8Array; rxKey: Uint8Array } | null {
    const keys = sessionKeyStore.get(session);
    if (!keys) return null;
    return { txKey: new Uint8Array(keys.txKey), rxKey: new Uint8Array(keys.rxKey) };
}

export function generateRandom256BitKey(): Uint8Array {
    return sodium.randombytes_buf(32);
}

/**
 * EDUCATIONAL ONLY — NEVER USE FOR REAL MESSAGING.
 * Demonstrates unauthenticated AES-CBC encryption without an integrity tag.
 */
export async function encryptAesCbcEducational(plaintext: string): Promise<{
    iv: string;
    ciphertext: string;
    rawKey: CryptoKey;
}> {
    const subtle = globalThis.crypto.subtle;
    const rawKey = await subtle.generateKey({ name: 'AES-CBC', length: 256 }, true, ['encrypt', 'decrypt']);
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const data = new TextEncoder().encode(plaintext);
    const encrypted = await subtle.encrypt({ name: 'AES-CBC', iv }, rawKey, data);
    return {
        iv: toBase64(iv),
        ciphertext: toBase64(new Uint8Array(encrypted)),
        rawKey,
    };
}

export async function decryptAesCbcEducational(
    ciphertextB64: string,
    ivB64: string,
    rawKey: CryptoKey
): Promise<string> {
    const subtle = globalThis.crypto.subtle;
    const iv = fromBase64(ivB64);
    const cipherBytes = fromBase64(ciphertextB64);
    const plainBuf = await subtle.decrypt(
        { name: 'AES-CBC', iv: iv as BufferSource },
        rawKey,
        cipherBytes as BufferSource
    );
    return new TextDecoder().decode(plainBuf);
}
