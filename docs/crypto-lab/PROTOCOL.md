# LAN Saturn Crypto Lab — Wire Protocol Specification

## 1. Authenticated Handshake
1. Each peer generates a long-term `Ed25519` identity keypair (`sodium.crypto_sign_keypair()`) and computes a 128-bit display fingerprint (`BLAKE2b-16`).
2. For each session (`session_id`), each peer generates an ephemeral `X25519` keypair and signs the transcript:
   ```
   lan-saturn-handshake-v1|<senderId>|<sessionId>|<base64(x25519PublicKey)>
   ```
3. Upon receiving the peer's bundle, the endpoint:
   - Verifies the `Ed25519` signature.
   - Verifies the peer's fingerprint against the expected/pinned identity fingerprint.
   - Computes the `X25519` shared secret (`crypto_scalarmult`).
   - Derives directional 256-bit keys (`txKey`, `rxKey`) via `HKDF-SHA256` with salt `lan-saturn-hkdf-salt-v1:<sessionId>` and directional `info` strings.
   - Zeroizes the raw `X25519` shared secret (`sodium.memzero`).

## 2. Encrypted Packet Format
```json
{
  "version": 1,
  "session_id": "saturn-lab-xyz",
  "sender": "alice",
  "receiver": "bob",
  "sequence": 1,
  "algorithm": "XChaCha20-Poly1305",
  "nonce": "<base64-encoded-24-byte-nonce>",
  "ciphertext": "<base64-encoded-ciphertext-with-16-byte-tag>"
}
```

## 3. Associated Authenticated Data (AAD)
AAD is serialized deterministically with sorted keys:
```json
{"algorithm":"XChaCha20-Poly1305","receiver":"bob","sender":"alice","sequence":1,"session_id":"saturn-lab-xyz","version":1}
```
Any modification to the metadata invalidates the `Poly1305` tag.
