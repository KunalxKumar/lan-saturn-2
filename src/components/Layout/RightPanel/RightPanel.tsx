import React, { useState } from 'react';
import OnlineUsers from './OnlineUsers';
import Tasks from './Tasks';
import { FolderSync, PanelRightClose, PanelRightOpen, ShieldCheck, Users } from 'lucide-react';

export default function RightPanel({
    users,
    currentUsername,
    channelTasks,
    toggleTask,
    deleteTask,
    createTask,
    activeView,
}) {
    const [collapsed, setCollapsed] = useState(false);

    if (activeView !== 'server' && activeView !== 'dm' && activeView !== 'filebrowser' && activeView !== 'cryptolab') {
        return null;
    }

    if (collapsed) {
        return (
            <aside className="w-10 bg-saturn-dark flex-none flex flex-col items-center py-3 border-l border-saturn-light text-[var(--text-secondary)]">
                <button
                    type="button"
                    onClick={() => setCollapsed(false)}
                    className="p-1.5 rounded hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] cursor-pointer"
                    title="Expand right panel"
                    aria-label="Expand right panel"
                >
                    <PanelRightOpen size={16} />
                </button>
            </aside>
        );
    }

    const headerTitle =
        activeView === 'filebrowser'
            ? 'Files & Transfers'
            : activeView === 'cryptolab'
              ? 'Session Security'
              : 'Members & Tasks';

    const HeaderIcon =
        activeView === 'filebrowser' ? FolderSync : activeView === 'cryptolab' ? ShieldCheck : Users;

    return (
        <aside className="w-64 bg-saturn-dark flex-none flex flex-col border-l border-saturn-light text-[var(--text-secondary)] hidden lg:flex">
            <div className="h-12 px-4 flex items-center justify-between border-b border-saturn-light shrink-0">
                <div className="flex items-center gap-2">
                    <HeaderIcon size={16} className="text-[var(--text-secondary)]" />
                    <span className="font-bold text-xs text-[var(--text-primary)] uppercase tracking-wider">{headerTitle}</span>
                </div>
                <button
                    type="button"
                    onClick={() => setCollapsed(true)}
                    className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                    title="Collapse right panel"
                    aria-label="Collapse right panel"
                >
                    <PanelRightClose size={15} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col">
                {(activeView === 'server' || activeView === 'dm') && (
                    <>
                        <OnlineUsers users={users} currentUsername={currentUsername} />
                        <div className="h-px bg-saturn-light mx-4 my-1 opacity-50" />
                        <Tasks
                            tasks={channelTasks}
                            onToggle={toggleTask}
                            onDelete={deleteTask}
                            onCreate={createTask}
                        />
                    </>
                )}

                {activeView === 'filebrowser' && (
                    <div className="p-4 space-y-3 text-xs">
                        <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
                            <div className="font-semibold text-[var(--text-primary)]">LAN Direct Share</div>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                Files are served directly over your local network between trusted peers.
                            </p>
                        </div>
                        <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
                            <div className="font-semibold text-[var(--text-primary)]">Online Peers</div>
                            <div className="text-[var(--accent-secure)] font-mono">{Array.isArray(users) ? users.length : 0} connected</div>
                        </div>
                    </div>
                )}

                {activeView === 'cryptolab' && (
                    <div className="p-4 space-y-2.5 text-xs font-mono">
                        <div className="p-3 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] space-y-1.5">
                            <div className="text-[var(--text-secondary)] text-[10px] uppercase">Cipher Suite</div>
                            <div className="text-[var(--accent-secure)] font-semibold">XChaCha20-Poly1305</div>
                            <div className="text-[var(--text-secondary)] text-[11px]">24B nonce · 16B MAC tag</div>
                        </div>
                        <div className="p-3 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] space-y-1.5">
                            <div className="text-[var(--text-secondary)] text-[10px] uppercase">Key Exchange &amp; KDF</div>
                            <div className="text-cyan-400">X25519 + Ed25519</div>
                            <div className="text-[var(--text-secondary)]">HKDF-SHA256 (tx/rx split)</div>
                        </div>
                        <div className="p-3 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] space-y-1">
                            <div className="text-[var(--text-secondary)] text-[10px] uppercase">Replay Protection</div>
                            <div className="text-[var(--accent-secure)]">Monotonic seq + seen set</div>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
