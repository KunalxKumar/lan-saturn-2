import React, { useEffect, useState } from 'react';
import { Hash, AlertTriangle } from 'lucide-react';
import { countDifferentHexNibbles, sha256Hex } from '../../crypto-lab/hashing';

export default function HashingLab() {
    const [originalMsg, setOriginalMsg] = useState('Transfer $100 to Bob');
    const [modifiedMsg, setModifiedMsg] = useState('Transfer $900 to Bob');
    const [originalHash, setOriginalHash] = useState('');
    const [modifiedHash, setModifiedHash] = useState('');

    useEffect(() => {
        let cancelled = false;
        Promise.all([sha256Hex(originalMsg), sha256Hex(modifiedMsg)]).then(([h1, h2]) => {
            if (!cancelled) {
                setOriginalHash(h1);
                setModifiedHash(h2);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [originalMsg, modifiedMsg]);

    const diffNibbles = countDifferentHexNibbles(originalHash, modifiedHash);
    const identical = originalHash && originalHash === modifiedHash;

    return (
        <section className="border border-white/15 bg-black/70 p-4 space-y-4 font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-white" />
                    <h2 className="text-xs font-bold uppercase tracking-widest text-white">
                        SHA-256 Hashing Laboratory
                    </h2>
                </div>
                <span className="text-[11px] px-2 py-0.5 border border-white/15 text-zinc-300">
                    {identical ? '0 / 64 hex chars differ' : `${diffNibbles} / 64 hex chars changed`}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="block text-[11px] uppercase tracking-wider text-zinc-400">
                        Original Message
                    </label>
                    <input
                        type="text"
                        value={originalMsg}
                        onChange={(e) => setOriginalMsg(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                    />
                    <div className="text-[11px] text-zinc-400 break-all bg-zinc-950/80 border border-white/10 p-2">
                        <span className="text-zinc-500 block mb-1">SHA-256 Digest:</span>
                        <span className="text-white">{originalHash || '...'}</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="block text-[11px] uppercase tracking-wider text-zinc-400">
                            Modified Message (1-char change)
                        </label>
                        <button
                            type="button"
                            onClick={() => {
                                if (!originalMsg.length) return;
                                const first = originalMsg[0];
                                const flipped = first === 'X' ? 'Y' : 'X';
                                setModifiedMsg(flipped + originalMsg.slice(1));
                            }}
                            className="text-[10px] uppercase tracking-wider px-2 py-0.5 border border-white/20 text-zinc-300 hover:bg-white hover:text-black transition-colors cursor-pointer"
                        >
                            Flip 1 char
                        </button>
                    </div>
                    <input
                        type="text"
                        value={modifiedMsg}
                        onChange={(e) => setModifiedMsg(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                    />
                    <div className="text-[11px] text-zinc-400 break-all bg-zinc-950/80 border border-white/10 p-2">
                        <span className="text-zinc-500 block mb-1">SHA-256 Digest:</span>
                        <span className="text-white">{modifiedHash || '...'}</span>
                    </div>
                </div>
            </div>

            <div className="border border-white/15 bg-zinc-950/70 p-3 text-xs text-zinc-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <div className="font-semibold text-white">
                        Why SHA-256 alone does NOT authenticate the sender
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                        SHA-256 is an unkeyed hash function: anyone on the network (including Eve) can modify the message
                        and recompute a valid SHA-256 digest for the forged text. By contrast, LAN Saturn&apos;s{' '}
                        <span className="text-white">Poly1305</span> authentication tag requires the shared secret key, so Eve
                        cannot forge a valid tag.
                    </p>
                </div>
            </div>
        </section>
    );
}
