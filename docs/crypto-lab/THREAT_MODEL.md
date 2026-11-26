# LAN Saturn Crypto Lab — Threat Model

## 1. System Overview & Trust Boundaries
LAN Saturn Crypto Lab models an **untrusted local-network relay** connecting two endpoints (**Alice** and **Bob**) in the presence of an active network attacker (**Eve**).

- **Trusted Endpoints (Alice & Bob):** Hold long-term `Ed25519` identity keys, ephemeral `X25519` keypairs, and derived `HKDF-SHA256` session keys inside non-serialized `WeakMap` key stores.
- **Untrusted Relay (Flask + Socket.IO / Lab Relay):** Forwards structured `EncryptedPacket` JSON frames. Does **not** possess `Ed25519` private keys, `X25519` private keys, or `XChaCha20-Poly1305` session keys.

## 2. Adversary Capabilities (Eve)
Eve is modeled as a Dolev–Yao network attacker who can:
1. **Passive Eavesdropping:** Capture all Socket.IO frames and Wireshark packets (`nonce`, `ciphertext`, `session_id`, `sender`, `receiver`, `sequence`).
2. **Ciphertext / Tag / Nonce Tampering:** Flip bits in transit before delivery to Bob.
3. **Metadata (AAD) Spoofing:** Alter `sender`, `receiver`, `session_id`, or `sequence` fields in the JSON envelope.
4. **Replay Attacks:** Re-transmit previously captured valid encrypted packets.
5. **Active MITM Key Substitution:** Attempt to replace Bob's ephemeral `X25519` public key during session establishment.

## 3. Security Mitigations
| Threat | Mitigation |
| :--- | :--- |
| Passive eavesdropping | `XChaCha20-Poly1305` 256-bit authenticated encryption with unique 24-byte nonces |
| Ciphertext / tag / nonce tampering | 16-byte `Poly1305` authentication tag verified before plaintext release |
| Metadata spoofing | Deterministic canonical JSON AAD bound to `version`, `session_id`, `sender`, `receiver`, `sequence`, `algorithm` |
| Replay attacks | Monotonic `lastRecvSequence` + `seenSequences` set updated only after AEAD verification |
| MITM key substitution | `Ed25519` signed handshake transcript + out-of-band fingerprint verification |
| Key reuse across directions | `HKDF-SHA256` derives separate directional `txKey` and `rxKey` bound to `session_id` |

## 4. Known Scope & Limitations
- Metadata (`sender`, `receiver`, `sequence`, `session_id`, and packet size) is intentionally authenticated rather than encrypted so the relay can route packets and Wireshark can inspect framing.
- UDP peer discovery broadcasts and LAN IP/port headers are not encrypted by the application-layer message protocol.
