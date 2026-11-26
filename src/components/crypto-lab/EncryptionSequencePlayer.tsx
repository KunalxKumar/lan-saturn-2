import React, { useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import { ENCRYPTION_SEQUENCE_STEPS } from '../../crypto-lab/hashing';
import { encryptText, decryptText } from '../../lib/crypto';
import sodium from 'libsodium-wrappers-sumo';

export default function EncryptionSequencePlayer() {
    const [stepIndex, setStepIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState<0.5 | 1 | 2>(1);
    const [plaintext, setPlaintext] = useState('Meet at 19:00 UTC — bring the key.');
    const [demoResult, setDemoResult] = useState<{
        nonce: string;
        ciphertext: string;
        recovered: string;
    } | null>(null);

    // Compute real libsodium XChaCha20-Poly1305 output isolated from animation state
    useEffect(() => {
        let cancelled = false;
        (async () => {
            await sodium.ready;
            const demoPass = 'saturn-demo-ephemeral-key';
            const sealed = encryptText(plaintext, demoPass);
            const recovered = decryptText(sealed.data, demoPass, sealed.salt, sealed.nonce);
            if (!cancelled) {
                setDemoResult({
                    nonce: sealed.nonce,
                    ciphertext: sealed.data,
                    recovered,
                });
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [plaintext]);

    useEffect(() => {
        if (!isPlaying) return;
        const ms = Math.round(1600 / speed);
        const timer = setInterval(() => {
            setStepIndex((prev) => {
                if (prev >= ENCRYPTION_SEQUENCE_STEPS.length - 1) {
                    setIsPlaying(false);
                    return prev;
                }
                return prev + 1;
            });
        }, ms);
        return () => clearInterval(timer);
    }, [isPlaying, speed]);

    const step = ENCRYPTION_SEQUENCE_STEPS[stepIndex];

    return (
        <section className="border border-white/15 bg-black/70 p-4 space-y-4 font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-white">
                        Animated XChaCha20-Poly1305 Sequence (9 Stages)
                    </h2>
                    <p className="text-[11px] text-zinc-400">
                        Stage {step.id} / {ENCRYPTION_SEQUENCE_STEPS.length} — {step.title}
                    </p>
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => {
                            setIsPlaying(false);
                            setStepIndex((i) => Math.max(0, i - 1));
                        }}
                        disabled={stepIndex === 0}
                        className="p-1.5 border border-white/15 text-white hover:bg-white hover:text-black disabled:opacity-30 cursor-pointer"
                        title="Previous"
                    >
                        <SkipBack className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsPlaying((p) => !p)}
                        className="px-2.5 py-1.5 border border-white/25 bg-white text-black text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        title={isPlaying ? 'Pause' : 'Play'}
                    >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{isPlaying ? 'Pause' : 'Play'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setIsPlaying(false);
                            setStepIndex((i) => Math.min(ENCRYPTION_SEQUENCE_STEPS.length - 1, i + 1));
                        }}
                        disabled={stepIndex === ENCRYPTION_SEQUENCE_STEPS.length - 1}
                        className="p-1.5 border border-white/15 text-white hover:bg-white hover:text-black disabled:opacity-30 cursor-pointer"
                        title="Next"
                    >
                        <SkipForward className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setIsPlaying(false);
                            setStepIndex(0);
                        }}
                        className="p-1.5 border border-white/15 text-white hover:bg-white hover:text-black cursor-pointer"
                        title="Reset"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <select
                        value={speed}
                        onChange={(e) => setSpeed(Number(e.target.value) as 0.5 | 1 | 2)}
                        className="bg-zinc-950 border border-white/15 text-[11px] text-white px-2 py-1 focus:outline-none"
                        title="Playback speed"
                    >
                        <option value={0.5}>0.5x</option>
                        <option value={1}>1x</option>
                        <option value={2}>2x</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-9 gap-1">
                {ENCRYPTION_SEQUENCE_STEPS.map((s, idx) => (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                            setIsPlaying(false);
                            setStepIndex(idx);
                        }}
                        className={`h-1.5 transition-colors cursor-pointer ${
                            idx === stepIndex
                                ? 'bg-white'
                                : idx < stepIndex
                                ? 'bg-zinc-500'
                                : 'bg-zinc-800'
                        }`}
                        title={`${s.id}. ${s.title}`}
                    />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2 text-[11px] border border-white/10 bg-zinc-950/70 p-3">
                    <div>
                        <span className="text-zinc-500 uppercase">Operation: </span>
                        <span className="text-white">{step.operation}</span>
                    </div>
                    <div>
                        <span className="text-zinc-500 uppercase">Primitive: </span>
                        <span className="text-zinc-200">{step.primitive}</span>
                    </div>
                    <div>
                        <span className="text-zinc-500 uppercase">Why: </span>
                        <span className="text-zinc-300">{step.why}</span>
                    </div>
                    <div>
                        <span className="text-zinc-500 uppercase">Attacker View: </span>
                        <span className="text-amber-300">{step.attackerView}</span>
                    </div>
                    <div>
                        <span className="text-zinc-500 uppercase">Security Property: </span>
                        <span className="text-emerald-400">{step.securityProperty}</span>
                    </div>
                </div>

                <div className="space-y-2 text-[11px] border border-white/10 bg-zinc-950/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-zinc-500 uppercase">Demo Plaintext</span>
                        <span className="text-[10px] text-zinc-500">Actor: {step.actor.toUpperCase()}</span>
                    </div>
                    <input
                        type="text"
                        value={plaintext}
                        onChange={(e) => setPlaintext(e.target.value)}
                        className="w-full bg-black border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white"
                    />
                    {demoResult && (
                        <div className="space-y-1 pt-1 break-all">
                            <div>
                                <span className="text-zinc-500">24B Nonce: </span>
                                <span className="text-amber-300">{demoResult.nonce}</span>
                            </div>
                            <div>
                                <span className="text-zinc-500">Ciphertext + 16B Tag: </span>
                                <span className="text-zinc-300">{demoResult.ciphertext}</span>
                            </div>
                            <div>
                                <span className="text-zinc-500">Bob Recovered: </span>
                                <span className="text-emerald-400">{demoResult.recovered}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
