# LAN Saturn Crypto Lab — Experiment Results & Verification Matrix

## Verification Test Matrix
All 12 automated verification cases are implemented in `tests/crypto_lab/crypto_lab.test.ts` (Vitest):

| # | Test Case | Expected Result | Priority |
| :- | :--- | :--- | :--- |
| 1 | Correct key decrypts message | PASS | Essential |
| 2 | Wrong 256-bit key fails | Rejected | Essential |
| 3 | Ciphertext byte changed | Rejected | Essential |
| 4 | Poly1305 authentication tag changed | Rejected | Essential |
| 5 | 24-byte nonce changed | Rejected | Essential |
| 6 | AAD metadata changed | Rejected | Essential |
| 7 | Replay captured packet | Rejected | High |
| 8 | Verified identity mismatch (MITM) | Rejected | High |
| 9 | Empty message (`""`) | Correctly processed | High |
| 10 | Large message (`128 KB`) | Correctly processed | Medium |
| 11 | New session after reconnection | Stale packets rejected | High |
| 12 | Encryption performance + AES-CBC comparison | Measured | Medium |

## Raw Cryptographic Overhead (XChaCha20-Poly1305)
Fixed per-message cryptographic overhead = **24 B nonce + 16 B Poly1305 tag = 40 B** (excluding JSON/base64 envelope and Socket.IO framing):
- **128 B plaintext** → 168 B raw (`31.25%` overhead)
- **1 KB (1,024 B) plaintext** → 1,064 B raw (`3.91%` overhead)
- **10 KB (10,240 B) plaintext** → 10,280 B raw (`0.39%` overhead)
- **1 MB (1,048,576 B) plaintext** → 1,048,616 B raw (`0.00%` overhead)
