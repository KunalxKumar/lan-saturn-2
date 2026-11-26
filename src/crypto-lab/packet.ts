import sodium from 'libsodium-wrappers-sumo';

export const PACKET_VERSION = 1 as const;
export const AEAD_ALGORITHM = 'XChaCha20-Poly1305' as const;
export const AEAD_NONCE_BYTES = 24;
export const AEAD_TAG_BYTES = 16;

export interface EncryptedPacket {
    version: 1;
    session_id: string;
    sender: string;
    receiver: string;
    sequence: number;
    algorithm: 'XChaCha20-Poly1305';
    nonce: string; // base64-encoded 24-byte nonce
    ciphertext: string; // base64-encoded ciphertext + 16-byte Poly1305 tag
}

export interface PacketMetadata {
    version: 1;
    session_id: string;
    sender: string;
    receiver: string;
    sequence: number;
    algorithm: 'XChaCha20-Poly1305';
}

/**
 * Deterministically serialize packet metadata into Associated Authenticated Data (AAD).
 * Uses fixed field order and canonical JSON so sender and receiver always derive identical AAD bytes.
 */
export function serializePacketAAD(meta: PacketMetadata): Uint8Array {
    const canonical = JSON.stringify({
        algorithm: meta.algorithm,
        receiver: meta.receiver,
        sender: meta.sender,
        sequence: meta.sequence,
        session_id: meta.session_id,
        version: meta.version,
    });
    return sodium.from_string(canonical);
}

export function extractPacketMetadata(packet: EncryptedPacket): PacketMetadata {
    return {
        version: packet.version,
        session_id: packet.session_id,
        sender: packet.sender,
        receiver: packet.receiver,
        sequence: packet.sequence,
        algorithm: packet.algorithm,
    };
}

export function toBase64(bytes: Uint8Array): string {
    return sodium.to_base64(bytes, sodium.base64_variants.ORIGINAL);
}

export function fromBase64(b64: string): Uint8Array {
    return sodium.from_base64(b64, sodium.base64_variants.ORIGINAL);
}

export function toHexPreview(bytes: Uint8Array, maxBytes = 12): string {
    const slice = bytes.slice(0, maxBytes);
    const hex = Array.from(slice, (b) => b.toString(16).padStart(2, '0')).join('');
    return bytes.length > maxBytes ? `${hex}...` : hex;
}
