import React from 'react';
import { Settings } from 'lucide-react';

export default function UserProfile({ currentUsername, setCurrentUsername }) {
    return (
        <div className="user-profile-card p-3 mx-2 my-2 rounded-xl bg-saturn-card/60 backdrop-blur border border-white/5 flex items-center gap-3">
            <div className="user-avatar-wrapper relative flex-shrink-0">
                <div className="user-avatar w-8 h-8 rounded-full bg-[var(--accent-secure-dim)] text-[var(--accent-secure)] font-bold flex items-center justify-center text-sm border border-[var(--border-strong)]">
                    {currentUsername.charAt(0).toUpperCase()}
                </div>
                <div className="status-badge online absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--accent-secure)] ring-2 ring-[var(--bg-canvas)]"></div>
            </div>
            <div className="user-info flex-1 flex flex-col min-w-0">
                <input
                    className="username-edit-input bg-transparent border-b border-transparent hover:border-[var(--border-strong)] focus:border-[var(--accent-secure)] text-xs font-semibold text-[var(--text-primary)] outline-none w-full truncate"
                    value={currentUsername}
                    onChange={(e) => setCurrentUsername(e.target.value || 'Anonymous')}
                    title="Edit username"
                />
                <span className="user-status-text text-[10px] text-[var(--text-secondary)]">Online</span>
            </div>
            <button className="user-settings-btn text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 rounded-lg hover:bg-white/5" title="User Settings">
                <Settings size={16} />
            </button>
        </div>
    );
}
