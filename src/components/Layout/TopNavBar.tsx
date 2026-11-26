import React, { useEffect, useRef } from 'react';
import { Search, History, Bell, HelpCircle, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import appLogo from '../../../assets/icons/app-logo.svg';

export default function TopNavBar({
    searchQuery,
    setSearchQuery,
    currentUsername,
    connectionStatus,
    sidebarOpen = true,
    onToggleSidebar,
    notificationsOpen = false,
    onToggleNotifications,
    notificationCount = 0
}) {
    const searchInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    return (
        <nav className="flex justify-between items-center px-4 w-full h-14 bg-[#000000] border-b border-[#1f1f1f] shrink-0 z-20 relative">
            <div className="flex items-center gap-2.5">
                {onToggleSidebar && (
                    <button
                        type="button"
                        onClick={onToggleSidebar}
                        className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-all duration-200 active:scale-95 cursor-pointer"
                        title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
                        aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
                    >
                        <span className={`block transition-transform duration-200 ${sidebarOpen ? 'rotate-0' : 'rotate-180'}`}>
                            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                        </span>
                    </button>
                )}
                <img src={appLogo} alt="" className="w-7 h-7" />
                <span className="text-lg font-black text-[#dfe2eb] tracking-tight">LAN Saturn</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono flex items-center gap-1.5 ${connectionStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                    {connectionStatus === 'connected' ? 'Connected' : 'Offline'}
                </span>
            </div>

            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-sm mx-6">
                <div className="relative w-full group">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        ref={searchInputRef}
                        className="w-full bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-md py-1.5 pl-9 pr-14 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-white/35 focus:ring-1 focus:ring-white/20 transition-all"
                        placeholder="Search across channels..."
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-neutral-400 bg-black/80 border border-white/10 px-1.5 py-0.5 rounded">
                        Ctrl+K
                    </kbd>
                </div>
            </div>

            <div className="flex items-center gap-1.5">
                <button className="text-neutral-400 hover:text-white hover:bg-white/10 transition-colors p-1.5 rounded-full flex items-center justify-center" title="History">
                    <History size={17} />
                </button>
                <button
                    type="button"
                    onClick={onToggleNotifications}
                    className={`p-1.5 rounded-full flex items-center justify-center relative transition-all duration-200 active:scale-90 cursor-pointer ${
                        notificationsOpen
                            ? 'bg-white text-black'
                            : 'text-neutral-400 hover:text-white hover:bg-white/10'
                    }`}
                    title="Notifications"
                    aria-label="Toggle Notifications"
                >
                    <Bell size={17} className={`transition-transform duration-300 ${notificationsOpen ? 'rotate-12 scale-110' : 'hover:rotate-12'}`} />
                    {notificationCount > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    )}
                </button>
                <button className="text-neutral-400 hover:text-white hover:bg-white/10 transition-colors p-1.5 rounded-full flex items-center justify-center hidden sm:flex" title="Help">
                    <HelpCircle size={17} />
                </button>
                <div className="h-5 w-px bg-white/10 mx-1 hidden sm:block"></div>
                <div className="ml-1 w-7 h-7 rounded-full border border-white/15 bg-white/10 backdrop-blur-md text-white font-bold flex items-center justify-center text-xs">
                    {currentUsername ? currentUsername.charAt(0).toUpperCase() : 'A'}
                </div>
            </div>
        </nav>
    );
}
