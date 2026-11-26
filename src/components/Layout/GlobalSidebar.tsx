import React from 'react';
import { Hash, Folder, Plus } from 'lucide-react';
import appLogo from '../../../assets/icons/app-logo-mono.svg';
import attackLabIcon from '../../../assets/icons/mono/12-attack-lab.svg';

export default function GlobalSidebar({ activeView, setActiveView }) {
    const isLabEnabled =
        import.meta.env.DEV ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

    return (
        <aside className="w-[60px] h-full bg-[#000000] border-r border-[var(--border-subtle)] shrink-0 flex flex-col items-center py-3 gap-2.5 hidden md:flex z-10 relative">
            <div
                className="w-10 h-10 rounded-[14px] bg-[var(--bg-panel)] border border-[#262626] flex items-center justify-center cursor-pointer hover:rounded-xl transition-all duration-200 overflow-hidden group p-1.5"
                onClick={() => setActiveView('server')}
                title="LAN Saturn Main Server"
            >
                <img src={appLogo} alt="LAN Saturn" className="w-full h-full object-contain invert" />
            </div>
            <div className="w-6 h-[1px] bg-[#1f1f1f] my-0.5" />
            <button
                type="button"
                className={`w-10 h-10 rounded-[20px] hover:rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 ${activeView === 'server' ? 'bg-white text-black rounded-xl' : 'bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-white border border-[var(--border-subtle)]'}`}
                onClick={() => setActiveView('server')}
                title="Channels"
                aria-label="Channels"
            >
                <Hash size={18} />
            </button>
            <button
                type="button"
                className={`w-10 h-10 rounded-[20px] hover:rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 ${activeView === 'filebrowser' ? 'bg-white text-black rounded-xl' : 'bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-white border border-[var(--border-subtle)]'}`}
                onClick={() => setActiveView('filebrowser')}
                title="File Browser"
                aria-label="File Browser"
            >
                <Folder size={18} />
            </button>
            {isLabEnabled && (
                <button
                    type="button"
                    className={`w-10 h-10 rounded-[20px] hover:rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 ${activeView === 'cryptolab' ? 'bg-white text-black rounded-xl' : 'bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-white border border-[var(--border-subtle)]'}`}
                    onClick={() => {
                        setActiveView('cryptolab');
                        if (window.location.pathname !== '/crypto-lab') {
                            window.history.pushState({}, '', '/crypto-lab');
                        }
                    }}
                    title="Crypto Attack Lab (/crypto-lab)"
                    aria-label="Crypto Attack Lab"
                >
                    <img src={attackLabIcon} alt="" className={`w-5 h-5 ${activeView === 'cryptolab' ? '' : 'invert'}`} />
                </button>
            )}
            <div
                className="w-10 h-10 rounded-[20px] hover:rounded-xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] flex items-center justify-center cursor-pointer hover:bg-white text-[var(--text-secondary)] hover:text-black transition-all duration-200 mt-auto"
                title="Add Channel"
            >
                <Plus size={18} />
            </div>
        </aside>
    );
}
