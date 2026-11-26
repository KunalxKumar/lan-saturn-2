import React, { useState } from 'react';
import { Shield, Hash, Pin } from 'lucide-react';

export default function ChatHeader({ 
    activeView, 
    activeChannel, 
    title, 
    searchQuery, 
    setSearchQuery, 
    isEncrypted, 
    cryptoReady,
    users = [],
    showLabDrawer = false,
    onToggleLabDrawer
}) {
    const [showSecurityPopover, setShowSecurityPopover] = useState(false);

    if (activeView !== 'server' && activeView !== 'dm') {
        return null;
    }

    const visibleUsers = Array.isArray(users) ? users.slice(0, 3) : [];
    const overflowCount = Array.isArray(users) && users.length > 3 ? users.length - 3 : 0;

    return (
        <header className="h-12 border-b border-[var(--border-subtle)] flex items-center px-4 bg-transparent shrink-0">
            <Hash size={18} className="text-[var(--text-secondary)] mr-2 shrink-0" />
            <h1 className="text-sm font-bold text-[var(--text-primary)] capitalize">{activeChannel}</h1>
            <div className="w-px h-4 bg-[var(--border-subtle)] mx-3"></div>
            <p className="text-xs text-[var(--text-secondary)] truncate hidden sm:block">{title || 'Company-wide discussions and announcements'}</p>

            <div className="ml-auto flex items-center gap-3 relative">
                {onToggleLabDrawer && (
                    <button
                        type="button"
                        onClick={onToggleLabDrawer}
                        className={`flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full border cursor-pointer transition-colors ${
                            showLabDrawer
                                ? 'bg-white text-black border-white font-semibold'
                                : 'bg-white/[0.04] text-[var(--text-secondary)] border-white/10 hover:text-white hover:border-white/25'
                        }`}
                        title="Toggle Crypto Lab panel in chat"
                    >
                        <span>Lab</span>
                    </button>
                )}
                {isEncrypted && (
                    <button
                        type="button"
                        onClick={() => setShowSecurityPopover((v) => !v)}
                        className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full cursor-pointer transition-colors ${cryptoReady ? 'bg-[var(--accent-secure-dim)] text-[var(--accent-secure)] hover:bg-[var(--accent-secure-dim)]' : 'bg-[var(--accent-warn-dim)] text-[var(--accent-warn)]'}`}
                        title="Click for E2EE security details"
                    >
                        <Shield size={12} />
                        <span>E2EE</span>
                    </button>
                )}

                {showSecurityPopover && (
                    <div className="absolute right-0 top-10 w-72 p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] z-50 text-xs space-y-2">
                        <div className="flex items-center justify-between font-semibold text-white">
                            <span>Channel Encryption</span>
                            <span className={cryptoReady ? 'text-[var(--accent-secure)]' : 'text-[var(--accent-warn)]'}>
                                {cryptoReady ? 'Active' : 'Initializing'}
                            </span>
                        </div>
                        <div className="font-mono text-[11px] text-[var(--text-secondary)] space-y-1">
                            <div>Algorithm: XChaCha20-Poly1305</div>
                            <div>KDF: Argon2id (passphrase-based)</div>
                            <div className="text-[var(--accent-warn)]/90 text-[10px] pt-1 border-t border-[var(--border-subtle)]">
                                Tip: Set a custom passphrase in Security Panel or test X25519+Ed25519 in Crypto Lab.
                            </div>
                        </div>
                    </div>
                )}
                
                {visibleUsers.length > 0 && (
                    <div className="flex -space-x-1.5 mr-1 hidden sm:flex items-center" title={`Online: ${visibleUsers.map(u => (typeof u === 'object' ? u.username : u)).join(', ')}`}>
                        {visibleUsers.map((u, i) => {
                            const name = typeof u === 'object' ? u.username || 'Anonymous' : u;
                            const initial = name.charAt(0).toUpperCase();
                            const bgColors = ['bg-[var(--accent-secure)]', 'bg-[var(--accent-warn)]', 'bg-[var(--accent-secure)]', 'bg-[var(--accent-warn)]'];
                            const bg = bgColors[i % bgColors.length];
                            return (
                                <div 
                                    key={i} 
                                    className={`w-6 h-6 rounded-full border-2 border-[var(--bg-canvas)] ${bg} text-white flex items-center justify-center text-[10px] font-bold`}
                                >
                                    {initial}
                                </div>
                            );
                        })}
                        {overflowCount > 0 && (
                            <div className="w-6 h-6 rounded-full border-2 border-[var(--bg-canvas)] bg-[var(--bg-hover)] text-[var(--text-secondary)] flex items-center justify-center text-[9px] font-mono font-bold">
                                +{overflowCount}
                            </div>
                        )}
                    </div>
                )}

                <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 rounded-md hover:bg-[var(--bg-elevated)]" title="Pin Message">
                    <Pin size={16} />
                </button>
            </div>
        </header>
    );
}
