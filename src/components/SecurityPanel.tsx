import React, { useState, useEffect } from 'react';
import { Shield, Lock, Key, Laptop, Check, X, Copy } from 'lucide-react';

export default function SecurityPanel({ socket, channel, username, encryptionPassphrase, setEncryptionPassphrase, cryptoReady }) {
    const [devices, setDevices] = useState([]);
    const [password, setPassword] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        if (!socket) return;
        socket.emit('get_device_list');

        socket.on('device_list_updated', (data) => {
            setDevices(data.devices || []);
        });

        socket.on('invite_generated', (data) => {
            if (data.channel === channel) {
                setInviteCode(data.code);
                showStatus('Invite code generated');
            }
        });

        socket.on('security_error', (data) => {
            showStatus(`Error: ${data.message}`);
        });

        return () => {
            socket.off('device_list_updated');
            socket.off('invite_generated');
            socket.off('security_error');
        };
    }, [socket, channel]);

    const showStatus = (msg) => {
        setStatusMessage(msg);
        setTimeout(() => setStatusMessage(''), 3000);
    };

    const handleSetLock = () => {
        if (!socket) return;
        socket.emit('set_channel_lock', {
            channel,
            password,
            username
        });
        showStatus(password ? 'Channel locked' : 'Channel unlocked');
        setPassword('');
    };

    const handleGenerateInvite = () => {
        if (!socket) return;
        socket.emit('generate_invite', { channel });
    };

    const handleToggleTrust = (device) => {
        if (!socket) return;
        socket.emit('update_device_trust', {
            ip: device.ip,
            userAgent: device.userAgent,
            trusted: !device.trusted
        });
    };

    const cleanUserAgent = (ua) => {
        if (!ua) return 'Unknown Browser';
        if (ua.includes('Firefox')) return 'Firefox Browser';
        if (ua.includes('Chrome')) return 'Chrome Browser';
        if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari Browser';
        if (ua.includes('Edge')) return 'Edge Browser';
        return ua.substring(0, 25) + '...';
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-transparent text-[var(--text-primary)] p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full space-y-6">
                {statusMessage && (
                    <div className="bg-[var(--accent-secure)]/20 border border-[var(--accent-secure)] text-[var(--accent-secure)] text-xs font-mono px-4 py-2 rounded-xl animate-pulse">
                        {statusMessage}
                    </div>
                )}

                {/* E2EE Custom Key Manager */}
                <div className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <Shield size={20} className="text-[var(--accent-secure)]" />
                        <h3 className="font-bold text-sm text-[var(--text-primary)]">End-to-End Encryption (E2EE)</h3>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
                        Traffic across LAN is encrypted end-to-end. You can configure a custom passphrase for maximum privacy.
                    </p>
                    <div className="flex items-center gap-3">
                        <input
                            type="password"
                            placeholder="Custom E2EE Passphrase..."
                            value={encryptionPassphrase === 'LAN-SATURN-DEFAULT-KEY' ? '' : encryptionPassphrase}
                            onChange={e => setEncryptionPassphrase(e.target.value || 'LAN-SATURN-DEFAULT-KEY')}
                            className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-secure)]"
                        />
                        <span className={`text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 ${cryptoReady ? 'bg-[var(--accent-secure-dim)] text-[var(--accent-secure)] border border-[var(--accent-secure)]' : 'bg-[var(--accent-warn-dim)] text-[var(--accent-warn)] border border-[var(--accent-warn)]'}`}>
                            {cryptoReady ? 'Active ✅' : 'Initializing...'}
                        </span>
                    </div>
                </div>

                {/* Channel Lockdown */}
                <div className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <Lock size={20} className="text-[var(--accent-warn)]" />
                        <h3 className="font-bold text-sm text-[var(--text-primary)]">Channel Lockdown (#{channel})</h3>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
                        Lock this channel with a password. Joining users will require the password or a valid invite code.
                    </p>
                    <div className="flex items-center gap-3">
                        <input
                            type="password"
                            placeholder="Set Channel Password (leave blank to unlock)..."
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-secure)]"
                        />
                        <button 
                            onClick={handleSetLock}
                            className="bg-[var(--accent-secure)] hover:bg-[#00CC52] text-[var(--bg-canvas)] text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                        >
                            Update Lock
                        </button>
                    </div>
                </div>

                {/* Invite Code Generator */}
                <div className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <Key size={20} className="text-[var(--accent-secure)]" />
                        <h3 className="font-bold text-sm text-[var(--text-primary)]">Generate Channel Invite Code</h3>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
                        Generate a 1-time access invite code for users to join locked channels.
                    </p>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleGenerateInvite}
                            className="bg-[var(--accent-secure)] hover:bg-[#00CC52] text-[var(--bg-canvas)] text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                        >
                            Generate Invite
                        </button>
                        {inviteCode && (
                            <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--accent-secure)] px-3 py-1.5 rounded-lg">
                                <span className="text-xs font-mono text-[var(--accent-secure)] font-bold">{inviteCode}</span>
                                <button 
                                    onClick={() => navigator.clipboard.writeText(inviteCode)} 
                                    className="text-[var(--text-secondary)] hover:text-white"
                                    title="Copy Code"
                                >
                                    <Copy size={13} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Connected Devices Table */}
                <div className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <Laptop size={20} className="text-cyan-400" />
                        <h3 className="font-bold text-sm text-[var(--text-primary)]">Connected LAN Devices</h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-[var(--text-secondary)]">
                            <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-mono text-[11px] uppercase">
                                <tr>
                                    <th className="p-2.5 rounded-l-lg">IP Address</th>
                                    <th className="p-2.5">User Agent</th>
                                    <th className="p-2.5">Status</th>
                                    <th className="p-2.5 rounded-r-lg text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)]">
                                {devices.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="text-center py-6 text-[var(--text-muted)] italic">No devices found.</td>
                                    </tr>
                                ) : (
                                    devices.map((device, idx) => (
                                        <tr key={idx} className="hover:bg-[var(--bg-elevated)]/50 transition-colors">
                                            <td className="p-2.5 font-mono text-[var(--accent-secure)] font-semibold">{device.ip}</td>
                                            <td className="p-2.5">{cleanUserAgent(device.userAgent)}</td>
                                            <td className="p-2.5">
                                                {device.trusted ? (
                                                    <span className="text-[var(--accent-secure)] bg-[var(--accent-secure-dim)] px-2 py-0.5 rounded-full font-mono text-[10px] border border-[var(--accent-secure)]">Trusted</span>
                                                ) : (
                                                    <span className="text-[var(--accent-warn)] bg-[var(--accent-warn-dim)] px-2 py-0.5 rounded-full font-mono text-[10px] border border-[var(--accent-warn)]">Untrusted</span>
                                                )}
                                            </td>
                                            <td className="p-2.5 text-right">
                                                <button 
                                                    onClick={() => handleToggleTrust(device)}
                                                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${device.trusted ? 'bg-[var(--accent-danger-dim)] text-[var(--accent-danger)] hover:bg-[var(--accent-danger-dim)]' : 'bg-[var(--accent-secure-dim)] text-[var(--accent-secure)] hover:bg-[var(--accent-secure-dim)]'}`}
                                                >
                                                    {device.trusted ? 'Revoke Trust' : 'Trust Device'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
