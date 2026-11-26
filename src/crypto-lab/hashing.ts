export interface AnimationStepMeta {
    id: number;
    title: string;
    actor: 'alice' | 'network' | 'eve' | 'bob';
    operation: string;
    primitive: string;
    why: string;
    attackerView: string;
    securityProperty: string;
}

export const ENCRYPTION_SEQUENCE_STEPS: AnimationStepMeta[] = [
    {
        id: 1,
        title: 'Alice enters plaintext',
        actor: 'alice',
        operation: 'Encode UTF-8 plaintext message bytes on sender device.',
        primitive: 'UTF-8 TextEncoder / sodium.from_string',
        why: 'Cryptographic ciphers operate on raw byte arrays rather than UI strings.',
        attackerView: 'None — plaintext exists only in Alice’s local memory.',
        securityProperty: 'Local Confidentiality',
    },
    {
        id: 2,
        title: 'Shared symmetric key',
        actor: 'alice',
        operation: 'Use the 32-byte symmetric key shared by Alice and Bob.',
        primitive: 'Argon2id KDF / X25519 + HKDF-SHA256',
        why: 'Both endpoints need the exact same 256-bit key to encrypt and verify.',
        attackerView: 'Eve does not possess the secret key.',
        securityProperty: 'Key Secrecy',
    },
    {
        id: 3,
        title: 'Generate 24-byte nonce',
        actor: 'alice',
        operation: 'Sample 24 cryptographically random bytes for the nonce.',
        primitive: 'CSPRNG (sodium.randombytes_buf)',
        why: 'Never reusing a nonce with the same key prevents keystream reuse attacks.',
        attackerView: 'Nonce is public and will travel in the packet header.',
        securityProperty: 'Semantic Security (IND-CPA)',
    },
    {
        id: 4,
        title: 'Encrypt with XChaCha20-Poly1305',
        actor: 'alice',
        operation: 'Encrypt plaintext and compute 16-byte authentication tag over ciphertext + AAD.',
        primitive: 'XChaCha20-Poly1305 AEAD',
        why: 'Combines confidentiality (stream cipher) and integrity/authenticity (MAC) in one pass.',
        attackerView: 'Eve cannot observe internal keystream or tag computation.',
        securityProperty: 'Confidentiality + Integrity',
    },
    {
        id: 5,
        title: 'Output ciphertext & tag',
        actor: 'alice',
        operation: 'Package 24-byte nonce, ciphertext, and 16-byte Poly1305 tag.',
        primitive: 'AEAD Sealed Packet',
        why: 'Bob needs both the ciphertext and the tag to decrypt and verify authenticity.',
        attackerView: 'Ciphertext looks indistinguishable from uniform random bytes.',
        securityProperty: 'Ciphertext Indistinguishability',
    },
    {
        id: 6,
        title: 'Packet travels over network',
        actor: 'network',
        operation: 'Transmit sealed packet across the untrusted LAN/network.',
        primitive: 'Untrusted Transport (Socket.IO / Wire)',
        why: 'E2EE assumes the network and relay server can be observed or tampered with.',
        attackerView: 'Eve can capture, copy, delay, or flip bits in the packet.',
        securityProperty: 'Untrusted-Channel Resilience',
    },
    {
        id: 7,
        title: 'Eve inspects packet',
        actor: 'eve',
        operation: 'Eve reads header, nonce, and ciphertext without the secret key.',
        primitive: 'Passive Eavesdropping',
        why: 'Demonstrates that public metadata and ciphertext reveal no plaintext.',
        attackerView: 'Sees nonce + random-looking ciphertext + tag; plaintext is unreadable.',
        securityProperty: 'Passive Attack Resistance',
    },
    {
        id: 8,
        title: 'Bob verifies tag & decrypts',
        actor: 'bob',
        operation: 'Verify Poly1305 tag against AAD + ciphertext, then XOR keystream.',
        primitive: 'XChaCha20-Poly1305 Verify-Then-Decrypt',
        why: 'If even 1 bit of ciphertext, nonce, or AAD changed, decryption aborts.',
        attackerView: 'Any tampering is detected before plaintext is ever released.',
        securityProperty: 'Authenticity (INT-CTXT)',
    },
    {
        id: 9,
        title: 'Display recovered plaintext',
        actor: 'bob',
        operation: 'Decode verified bytes back into UTF-8 plaintext for Bob.',
        primitive: 'UTF-8 TextDecoder / sodium.to_string',
        why: 'Confirms end-to-end delivery with both secrecy and integrity intact.',
        attackerView: 'Eve still knows nothing about the recovered message.',
        securityProperty: 'End-to-End Authenticated Delivery',
    },
];

export async function sha256Hex(input: string): Promise<string> {
    const data = new TextEncoder().encode(input);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

export function countDifferentHexNibbles(a: string, b: string): number {
    const len = Math.min(a.length, b.length);
    let diff = Math.abs(a.length - b.length);
    for (let i = 0; i < len; i++) {
        if (a[i] !== b[i]) diff++;
    }
    return diff;
}
