import React from 'react';
import { Fingerprint } from 'lucide-react';
import { fromBase64 } from '../../crypto-lab/packet';
import type { SecurePacket } from '../../crypto-lab/secureChat';

interface CryptoInspectorProps {
    packet: SecurePacket;
    latencyMs?: number;
    verified?: boolean;
}

function b64Snippet(value: string, chars = 28): string {
    return value.length > chars ? `${value.slice(0, chars)}…` : value;
}

/**
 * Per-message crypto inspector: sequence, nonce, ciphertext snippet and latency.
 * Everything numeric uses JetBrains Mono + tabular-nums.
 */
export default function CryptoInspector({ packet, latencyMs, verified }: CryptoInspectorProps) {
    const nonceBytes = fromBase64(packet.nonce).length;
    const cipherBytes = fromBase64(packet.ciphertext).length;

    return (
        <div className="lab-inspector mt-2 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-[10px] text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5 uppercase tracking-wider">
                    <Fingerprint className="w-3 h-3" />
                    Packet inspector
                </span>
                <span className={verified ? 'text-[var(--accent-secure)]' : 'text-[var(--accent-warn)]'}>
                    {verified ? 'AUTHENTICATED' : packet.mode}
                </span>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
                <dt className="text-[var(--text-muted)]">seq</dt>
                <dd className="text-[var(--text-primary)]">#{String(packet.sequence).padStart(3, '0')}</dd>

                <dt className="text-[var(--text-muted)]">mode</dt>
                <dd className="text-[var(--text-primary)]">{packet.mode}</dd>

                <dt className="text-[var(--text-muted)]">nonce</dt>
                <dd className="text-[var(--accent-warn)] truncate" title={packet.nonce}>
                    {b64Snippet(packet.nonce)} <span className="text-[var(--text-muted)]">({nonceBytes}B)</span>
                </dd>

                <dt className="text-[var(--text-muted)]">cipher</dt>
                <dd className="text-[var(--accent-danger)] truncate" title={packet.ciphertext}>
                    {b64Snippet(packet.ciphertext)} <span className="text-[var(--text-muted)]">({cipherBytes}B)</span>
                </dd>

                <dt className="text-[var(--text-muted)]">latency</dt>
                <dd className="text-[var(--text-primary)]">
                    {typeof latencyMs === 'number' ? `${latencyMs.toFixed(3)} ms` : '—'}
                </dd>
            </dl>
        </div>
    );
}
