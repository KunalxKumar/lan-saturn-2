import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Activity, Gauge, Play, ShieldCheck } from 'lucide-react';
import StatusMark from '../motion/StatusMark';
import type { BenchmarkRow, ExperimentOutcome } from '../../crypto-lab/experiments';

interface SecurityResultsProps {
    outcomes: ExperimentOutcome[];
    benchmarks: BenchmarkRow[];
    isBenchmarking: boolean;
    onRunBenchmarks: () => void;
    onRunAllExperiments: () => void;
    hasPacket: boolean;
}

export default function SecurityResults({
    outcomes,
    benchmarks,
    isBenchmarking,
    onRunBenchmarks,
    onRunAllExperiments,
    hasPacket,
}: SecurityResultsProps) {
    const prefersReduced = useReducedMotion();

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Experiment Results */}
            <motion.section
                initial={prefersReduced ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl overflow-hidden"
            >
                <div className="p-4 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                        <ShieldCheck className="w-4 h-4 text-[var(--accent-secure)]" />
                        Security Verification Results
                    </div>
                    <motion.button
                        type="button"
                        whileHover={prefersReduced || !hasPacket ? undefined : { scale: 1.03 }}
                        whileTap={prefersReduced || !hasPacket ? undefined : { scale: 0.96 }}
                        onClick={onRunAllExperiments}
                        disabled={!hasPacket}
                        className="px-3 py-1.5 rounded-lg bg-[var(--accent-secure)] hover:bg-[#00CC52] disabled:opacity-40 text-[var(--bg-canvas)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-secure)]"
                    >
                        <Play className="w-3 h-3" />
                        Run All 5 Experiments
                    </motion.button>
                </div>

                <div className="p-4 space-y-2.5 max-h-[340px] overflow-y-auto">
                    {outcomes.length === 0 ? (
                        <div className="text-xs text-[var(--text-muted)] text-center py-6">
                            Run individual attacks in Eve&apos;s Dashboard or click &quot;Run All 5
                            Experiments&quot; after sending a message.
                        </div>
                    ) : (
                        outcomes.map((item) => (
                            <motion.div
                                key={`${item.id}-${item.name}`}
                                initial={prefersReduced ? false : { opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                                className={`p-4 rounded-lg border text-xs ${
                                    item.passed
                                        ? 'bg-[var(--accent-secure-dim)] border-[var(--accent-secure)]'
                                        : 'bg-[var(--accent-danger-dim)] border-[var(--accent-danger)]'
                                }`}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                    <span className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                        <StatusMark
                                            status={item.passed ? 'done' : 'failed'}
                                            size={16}
                                            strike={false}
                                        />
                                        {item.name}
                                    </span>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--bg-canvas)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                                        {item.securityProperty}
                                    </span>
                                </div>
                                <div className="text-[var(--text-primary)]">{item.summary}</div>
                                <div className="text-[11px] font-mono text-[var(--text-secondary)] mt-1.5 break-words">
                                    {item.details}
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </motion.section>

            {/* Performance Dashboard */}
            <motion.section
                initial={prefersReduced ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl overflow-hidden"
            >
                <div className="p-4 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                        <Gauge className="w-4 h-4 text-[var(--accent-secure)]" />
                        Performance &amp; Cryptographic Overhead
                    </div>
                    <motion.button
                        type="button"
                        whileHover={prefersReduced || isBenchmarking ? undefined : { scale: 1.03 }}
                        whileTap={prefersReduced || isBenchmarking ? undefined : { scale: 0.96 }}
                        onClick={onRunBenchmarks}
                        disabled={isBenchmarking}
                        className="px-3 py-1.5 rounded-lg bg-[var(--bg-canvas)] hover:bg-[var(--bg-hover)] disabled:opacity-40 text-[var(--accent-secure)] border border-[var(--accent-secure)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-secure)]"
                    >
                        <Activity className="w-3 h-3" />
                        {isBenchmarking ? 'Benchmarking…' : 'Run Benchmark'}
                    </motion.button>
                </div>

                <div className="p-4 overflow-x-auto">
                    {benchmarks.length === 0 ? (
                        <div className="text-xs text-[var(--text-muted)] text-center py-6">
                            Click &quot;Run Benchmark&quot; to measure AES-256-GCM / AES-256-CBC
                            encryption and decryption latency (128 B – 1 MB) on this machine.
                        </div>
                    ) : (
                        <table className="w-full text-left text-xs font-mono tabular-nums">
                            <thead>
                                <tr className="text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                                    <th className="py-2 pr-2">Size</th>
                                    <th className="py-2 px-2">Raw Wire</th>
                                    <th className="py-2 px-2">Overhead</th>
                                    <th className="py-2 px-2">Enc p50 / p95</th>
                                    <th className="py-2 pl-2">Dec p50 / p95</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
                                {benchmarks.map((row) => (
                                    <tr key={row.sizeLabel}>
                                        <td className="py-2.5 pr-2 font-semibold text-[var(--text-primary)]">
                                            {row.sizeLabel}
                                        </td>
                                        <td className="py-2.5 px-2">
                                            {row.totalRawEncryptedBytes.toLocaleString()} B
                                        </td>
                                        <td className="py-2.5 px-2 text-[var(--accent-warn)]">
                                            {row.overheadPercent}
                                        </td>
                                        <td className="py-2.5 px-2 text-[var(--accent-secure)]">
                                            {row.encryptMedianMs}ms / {row.encryptP95Ms}ms
                                        </td>
                                        <td className="py-2.5 pl-2 text-[var(--text-secondary)]">
                                            {row.decryptMedianMs}ms / {row.decryptP95Ms}ms
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    <p className="mt-3 text-[11px] text-[var(--text-muted)]">
                        AES-256-GCM overhead: 96-bit nonce + 128-bit tag (28 B fixed). AES-256-CBC:
                        128-bit IV + up to one padding block (16 B). Excludes JSON/base64 framing and
                        Socket.IO transport headers.
                    </p>
                </div>
            </motion.section>
        </div>
    );
}
