import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export default function WorkspaceHeader({ connectionStatus }) {
    return (
        <div className="workspace-header h-16 px-4 flex items-center justify-between border-b border-saturn-light shrink-0">
            <div className="workspace-info flex items-center gap-3">
                <div className="workspace-logo w-8 h-8 rounded-lg bg-[var(--accent-secure)] flex items-center justify-center font-bold text-white text-xs">LS</div>
                <div className="workspace-details flex flex-col">
                    <h2 className="workspace-name text-sm font-bold text-[var(--text-primary)] leading-tight">LAN Saturn</h2>
                    <div className={`workspace-status text-[11px] flex items-center gap-1 ${connectionStatus === 'connected' ? 'text-[var(--accent-secure)]' : 'text-[var(--accent-danger)]'}`}>
                        {connectionStatus === 'connected' ? (
                            <><Wifi size={11} /> Connected</>
                        ) : (
                            <><WifiOff size={11} /> Offline</>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
