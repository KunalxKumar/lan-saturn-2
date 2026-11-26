import React, { useState, useEffect } from 'react';
import { Folder, File, Download, ArrowLeft, RefreshCw, HardDrive, Share2 } from 'lucide-react';

/**
 * FileBrowser - Remote File Browser for LAN sharing.
 */
export default function FileBrowser({ socket, username }) {
    const [localSharePath, setLocalSharePath] = useState('');
    const [isSharingConfigured, setIsSharingConfigured] = useState(false);
    const [shareMessage, setShareMessage] = useState('');

    const [activeShares, setActiveShares] = useState({});
    const [selectedUser, setSelectedUser] = useState('');
    const [currentPath, setCurrentPath] = useState('');
    const [files, setFiles] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [browseError, setBrowseError] = useState('');

    useEffect(() => {
        fetchLocalConfig();
        if (!socket) return;
        socket.emit('get_shares');

        socket.on('shares_list', (data) => {
            setActiveShares(data.shares || {});
        });

        return () => {
            socket.off('shares_list');
        };
    }, [socket]);

    const fetchLocalConfig = async () => {
        try {
            const res = await fetch('/api/shared-directory/config');
            const data = await res.json();
            if (res.ok && data.success && data.path) {
                setLocalSharePath(data.path);
                setIsSharingConfigured(true);
                announceShareToLAN(data.path);
            }
        } catch (err) {
            console.error('Error fetching local share config:', err);
        }
    };

    const announceShareToLAN = (path) => {
        if (!socket) return;
        const folderName = path.split('\\').pop() || path.split('/').pop() || 'Shared Folder';
        socket.emit('announce_share', {
            username,
            folderName,
            port: 5000
        });
    };

    const handleSaveLocalConfig = async (e) => {
        e.preventDefault();
        setShareMessage('');
        try {
            const res = await fetch('/api/shared-directory/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: localSharePath })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setIsSharingConfigured(!!localSharePath);
                setShareMessage(data.message || 'Shared folder configured');
                announceShareToLAN(localSharePath);
                setTimeout(() => setShareMessage(''), 3000);
            } else {
                setShareMessage(data.error || 'Failed to update shared folder');
            }
        } catch (err) {
            setShareMessage('Error connecting to local server');
        }
    };

    const browseRemoteDir = async (remoteUser, subpath = '') => {
        const share = activeShares[remoteUser];
        if (!share) return;

        setLoadingFiles(true);
        setBrowseError('');
        setSelectedUser(remoteUser);
        setCurrentPath(subpath);

        try {
            const targetUrl = `http://${share.ip}:${share.port}/api/shared-directory/files?path=${encodeURIComponent(subpath)}`;
            const res = await fetch(targetUrl);
            const data = await res.json();
            if (res.ok && data.success) {
                setFiles(data.files || []);
            } else {
                setBrowseError(data.error || 'Unable to access shared folder');
            }
        } catch (err) {
            setBrowseError(`Connection to ${remoteUser}'s computer failed`);
        } finally {
            setLoadingFiles(false);
        }
    };

    const navigateUp = () => {
        if (!currentPath) return;
        const parts = currentPath.split('/').filter(Boolean);
        parts.pop();
        const parentPath = parts.join('/');
        browseRemoteDir(selectedUser, parentPath);
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const getDownloadUrl = (fileName) => {
        const share = activeShares[selectedUser];
        if (!share) return '#';
        const fullSubpath = currentPath ? `${currentPath}/${fileName}` : fileName;
        return `http://${share.ip}:${share.port}/api/shared-directory/download?file=${encodeURIComponent(fullSubpath)}`;
    };

    return (
        <div className="flex flex-1 h-full bg-transparent text-[var(--text-primary)] overflow-hidden">
            {/* Left Sidebar - Active LAN Shares & Local Config */}
            <div className="w-72 bg-[var(--bg-canvas)] border-r border-[var(--border-subtle)] flex flex-col p-4 shrink-0 overflow-y-auto">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border-subtle)]">
                    <Share2 size={18} className="text-[var(--accent-secure)]" />
                    <span className="font-bold text-sm text-[var(--text-primary)]">LAN Shared Folders</span>
                </div>

                {/* Local Folder Share Config */}
                <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-3 mb-6">
                    <span className="text-xs font-bold text-[var(--text-secondary)] mb-1 flex items-center gap-1.5">
                        <HardDrive size={14} className="text-[var(--accent-secure)]" /> Share My Folder
                    </span>
                    <form onSubmit={handleSaveLocalConfig} className="mt-2 space-y-2">
                        <input
                            type="text"
                            placeholder="C:\Users\Name\Shared"
                            value={localSharePath}
                            onChange={e => setLocalSharePath(e.target.value)}
                            className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-md px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-secure)]"
                        />
                        <button type="submit" className="w-full bg-[var(--accent-secure)] hover:bg-[#00CC52] text-[var(--bg-canvas)] text-xs font-semibold py-1.5 rounded-md transition-colors">
                            Save Local Share
                        </button>
                    </form>
                    {shareMessage && <p className="text-[11px] text-[var(--accent-secure)] mt-1.5 font-mono">{shareMessage}</p>}
                </div>

                {/* Active Shares List */}
                <div className="flex-1">
                    <span className="text-[11px] font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">Active LAN Users</span>
                    <div className="space-y-1">
                        {Object.keys(activeShares).length === 0 ? (
                            <div className="text-xs text-[var(--text-muted)] italic py-4">No active LAN folder shares found.</div>
                        ) : (
                            (Object.entries(activeShares) as [string, any][]).map(([user, share]) => {
                                const isSelected = selectedUser === user;
                                return (
                                    <button
                                        key={user}
                                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all text-left ${isSelected ? 'bg-[var(--accent-secure)]/20 border-[var(--accent-secure)] text-[var(--accent-secure)] font-semibold' : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
                                        onClick={() => browseRemoteDir(user, '')}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <Folder size={16} className="text-[var(--accent-warn)] shrink-0" />
                                            <div className="truncate">
                                                <div className="font-bold truncate">{user}</div>
                                                <div className="text-[10px] text-[var(--text-secondary)] truncate">{share.folderName}</div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Right Main Remote File Explorer Canvas */}
            <div className="flex-1 flex flex-col h-full bg-transparent p-6 overflow-hidden">
                {selectedUser ? (
                    <div className="flex flex-col h-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl p-4">
                        {/* Header & Breadcrumb Navigation */}
                        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] shrink-0 mb-4">
                            <div className="flex items-center gap-2 text-xs">
                                <button 
                                    className="p-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] disabled:opacity-30 disabled:cursor-not-allowed"
                                    onClick={navigateUp}
                                    disabled={!currentPath}
                                    title="Go Up"
                                >
                                    <ArrowLeft size={14} />
                                </button>
                                <span className="font-bold text-[var(--text-primary)]">{selectedUser}'s Shared Folder</span>
                                <span className="text-[var(--text-muted)]">/</span>
                                <span className="text-[var(--accent-secure)] font-mono">{currentPath || 'root'}</span>
                            </div>

                            <button 
                                className="p-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] flex items-center gap-1 text-xs"
                                onClick={() => browseRemoteDir(selectedUser, currentPath)}
                                title="Refresh"
                            >
                                <RefreshCw size={13} className={loadingFiles ? "animate-spin" : ""} />
                                <span>Refresh</span>
                            </button>
                        </div>

                        {/* File Content Grid / Table */}
                        {loadingFiles ? (
                            <div className="flex-1 flex items-center justify-center text-xs text-[var(--accent-secure)] font-mono animate-pulse">Loading directory contents...</div>
                        ) : browseError ? (
                            <div className="flex-1 flex items-center justify-center text-xs text-[var(--accent-danger)] font-mono">{browseError}</div>
                        ) : files.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-xs text-[var(--text-muted)] italic">This directory is empty.</div>
                        ) : (
                            <div className="flex-1 overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {files.map((file, idx) => (
                                        <div key={idx} className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-3 flex items-center justify-between hover:border-[var(--accent-secure)] transition-colors group">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                {file.is_dir ? (
                                                    <Folder size={20} className="text-[var(--accent-warn)] shrink-0" />
                                                ) : (
                                                    <File size={20} className="text-[var(--accent-secure)] shrink-0" />
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    {file.is_dir ? (
                                                        <button 
                                                            className="font-semibold text-xs text-[var(--text-primary)] hover:text-[var(--accent-secure)] truncate text-left w-full block cursor-pointer"
                                                            onClick={() => browseRemoteDir(selectedUser, currentPath ? `${currentPath}/${file.name}` : file.name)}
                                                        >
                                                            {file.name}
                                                        </button>
                                                    ) : (
                                                        <span className="font-semibold text-xs text-[var(--text-primary)] truncate block">{file.name}</span>
                                                    )}
                                                    {!file.is_dir && <span className="text-[10px] text-[var(--text-secondary)] font-mono">{formatSize(file.size)}</span>}
                                                </div>
                                            </div>

                                            {!file.is_dir && (
                                                <a 
                                                    href={getDownloadUrl(file.name)} 
                                                    download={file.name} 
                                                    className="p-1.5 rounded-lg bg-[var(--accent-secure)]/20 hover:bg-[var(--accent-secure)] text-[var(--accent-secure)] hover:text-[var(--bg-canvas)] transition-colors ml-2 shrink-0"
                                                    title="Download file"
                                                >
                                                    <Download size={14} />
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[var(--bg-canvas)] border border-dashed border-[var(--border-subtle)] rounded-xl">
                            <Folder size={40} className="text-[var(--accent-secure)] mb-3" />
                            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">Share files with devices on your network</h3>
                            <p className="text-xs text-[var(--text-secondary)] max-w-sm mb-4">
                                Select a peer on the left to browse their shared folder, or configure your local folder to start sharing.
                            </p>
                            <button
                                type="button"
                                onClick={() => fetchLocalConfig()}
                                className="px-4 py-2 rounded-lg bg-[var(--accent-secure)] hover:bg-[#00CC52] text-[var(--bg-canvas)] text-xs font-semibold cursor-pointer transition-colors"
                            >
                                Refresh LAN Shares
                            </button>
                        </div>
                        <div className="p-4 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl">
                            <div className="text-xs font-semibold text-[var(--text-primary)] mb-2">Recent transfers</div>
                            <div className="text-xs text-[var(--text-muted)]">No recent remote file downloads in this session.</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
