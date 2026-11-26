import React, { useEffect, useMemo, useRef, useState } from 'react';
import MessageList from './components/Chat/MessageList';
import MessageComposer from './components/Chat/MessageComposer';
import Sidebar from './components/Layout/Sidebar/Sidebar';
import RightPanel from './components/Layout/RightPanel/RightPanel';
import TopNavBar from './components/Layout/TopNavBar';
import GlobalSidebar from './components/Layout/GlobalSidebar';
import JoinChannelModal from './components/Modals/JoinChannelModal';
import ChatHeader from './components/Chat/ChatHeader';
import AnnouncementBanner from './components/AnnouncementBanner';
import { Poll, CreatePollModal } from './components/Poll';
import SharedNotes from './components/SharedNotes';
import FileBrowser from './components/FileBrowser';
import TransferHistory from './components/TransferHistory';
import ClipboardSync from './components/ClipboardSync';
import SecurityPanel from './components/SecurityPanel';
import Calendar from './components/Calendar';
import CryptoLabPage from './components/crypto-lab/CryptoLabPage';
import SwipeToast from './components/motion/SwipeToast';
import useSocket from './hooks/useSocket';
import useChatMessages from './hooks/chat/useChatMessages';
import useSocketEvents from './hooks/socket/useSocketEvents';
import useEncryption from './hooks/encryption/useEncryption';
import { useAppStore, useUIStore, useChatStore, useSecurityStore } from './store/appStore';
import { uploadFileInChunks } from './lib/chunkedUpload';
import { BarChart3 } from 'lucide-react';

function App() {
    const [currentUsername, setCurrentUsername] = useState(localStorage.getItem('lanSaturn_username') || 'Anonymous');
    const { activeChannel, setActiveChannel, activeView, setActiveView, activeDmUser, setActiveDmUser } = useAppStore();
    const { searchQuery, setSearchQuery, showPollModal, setShowPollModal, showTransferHistory, setShowTransferHistory } = useUIStore();
    const { isTyping, setIsTyping, typingUser, setTypingUser, isUploading, setIsUploading, uploadStatus, setUploadStatus } = useChatStore();
    const { channelPasswords, setChannelPasswords, joiningChannel, setJoiningChannel, joinPassword, setJoinPassword, joinInvite, setJoinInvite } = useSecurityStore();
    const {
        encryptionPassphrase,
        setEncryptionPassphrase,
        isEncrypted,
        cryptoReady,
        encryptText,
        decryptText,
        encryptBytes,
        decryptBytes
    } = useEncryption();
    const [announcements, setAnnouncements] = useState([]);
    const [polls, setPolls] = useState([]);
    const [channelTasks, setChannelTasks] = useState([]);
    const [showLabDrawer, setShowLabDrawer] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth >= 768 : true
    );

    const messagesEndRef = useRef(null);

    const { socket, socketRef, connectionStatus, users } = useSocket(activeChannel, currentUsername);

    const {
        messages,
        setMessages,
        addMessage,
        sendReaction,
        sendMessage
    } = useChatMessages({
        socket,
        encryption: {
            encryptionPassphrase,
            cryptoReady,
            encryptText,
            decryptText
        },
        activeChannel,
        currentUsername,
        activeView,
        activeDmUser
    });

    useSocketEvents({
        socket,
        encryption: {
            encryptionPassphrase,
            decryptText
        },
        addMessage,
        setMessages,
        setTypingUser,
        setIsTyping,
        setAnnouncements,
        setPolls,
        setChannelTasks,
        setJoiningChannel,
        activeChannel,
        activeView,
        currentUsername,
        channelPasswords
    });

    const availableDmUsers = useMemo(
        () => users.filter(user => user !== currentUsername && user !== 'Anonymous'),
        [users, currentUsername]
    );

    // --- Effects ---

    useEffect(() => {
        if (currentUsername) {
            localStorage.setItem('lanSaturn_username', currentUsername);
        }
    }, [currentUsername]);

    // Re-decrypt messages when passphrase changes
    useEffect(() => {
        if (!cryptoReady || !encryptionPassphrase) return;

        setMessages(prev => prev.map(message => {
            if (!message.isEncrypted || !message.encryptedPayload || !message.salt || !message.nonce) {
                return message;
            }
            if (
                message.content &&
                !message.content.startsWith('[Encrypted message') &&
                !message.content.startsWith('[Decryption failed')
            ) {
                return message;
            }
            try {
                return {
                    ...message,
                    content: decryptText(message.encryptedPayload, encryptionPassphrase, message.salt, message.nonce)
                };
            } catch (error) {
                return { ...message, content: '[Decryption failed - wrong passphrase or damaged message]' };
            }
        }));
    }, [cryptoReady, encryptionPassphrase]);



    const isLabEnabled =
        import.meta.env.DEV ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

    // Sync /crypto-lab route in local/dev lab mode
    useEffect(() => {
        if (isLabEnabled && window.location.pathname === '/crypto-lab') {
            setActiveView('cryptolab');
        }
    }, [isLabEnabled, setActiveView]);

    // Auto-scroll
    useEffect(() => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }, [messages, activeChannel, activeDmUser, activeView]);

    // --- Handlers ---



    const handleFileUpload = async (file) => {
        if (!file) return;

        if (activeView === 'dm') {
            setUploadStatus('File upload is available in server channels.');
            setTimeout(() => setUploadStatus(''), 3000);
            return;
        }

        const maxFileSize = 4 * 1024 * 1024 * 1024;
        if (file.size > maxFileSize) {
            setUploadStatus('File is too large. Maximum size is 4 GB.');
            return;
        }

        const isLargeFile = file.size > 50 * 1024 * 1024;

        if (isLargeFile || !encryptionPassphrase) {
            setIsUploading(true);
            setUploadStatus(`Uploading ${file.name}...`);

            try {
                const result = await uploadFileInChunks(file, {
                    onProgress: (percent) => setUploadStatus('Uploading ' + file.name + ' (' + percent + '%)...')
                });

                if (result && result.success) {
                    const timestamp = new Date().toISOString();

                    socketRef.current?.emit('file_share', {
                        filename: result.filename,
                        fileUrl: result.fileUrl,
                        originalType: file.type || 'application/octet-stream',
                        originalSize: file.size,
                        encryptedFile: false,
                        username: currentUsername,
                        channel: activeChannel,
                        timestamp
                    });

                    addMessage({
                        id: `file_${Date.now()}_${Math.random()}`,
                        type: 'file',
                        username: currentUsername,
                        filename: result.filename,
                        fileUrl: result.fileUrl,
                        originalType: file.type || 'application/octet-stream',
                        originalSize: file.size,
                        encryptedFile: false,
                        decryptedUrl: URL.createObjectURL(file),
                        decryptedFilename: file.name,
                        channel: activeChannel,
                        timestamp,
                        isOwn: true
                    });

                    setUploadStatus(`Uploaded ${file.name}`);
                    setTimeout(() => setUploadStatus(''), 3000);
                } else {
                    setUploadStatus('Upload failed');
                }
            } catch (error: any) {
                console.error('Error uploading file:', error);
                setUploadStatus(error?.message || 'Upload failed. Try again.');
            } finally {
                setIsUploading(false);
            }
            return;
        }

        if (!cryptoReady) {
            setUploadStatus('Encryption is still loading. Try again in a moment.');
            return;
        }

        setIsUploading(true);
        setUploadStatus(`Encrypting ${file.name}...`);

        try {
            const plainBytes = new Uint8Array(await file.arrayBuffer());
            const encryptedFile = encryptBytes(plainBytes, encryptionPassphrase);
            const encryptedBlob = new Blob([encryptedFile.cipherBytes as unknown as BlobPart], { type: 'application/octet-stream' });
            const formData = new FormData();
            formData.append('file', encryptedBlob, `${file.name}.lsenc`);
            setUploadStatus(`Uploading encrypted ${file.name}...`);

            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();

            if (response.ok && result.success) {
                const timestamp = new Date().toISOString();

                socketRef.current.emit('file_share', {
                    filename: result.filename,
                    fileUrl: result.fileUrl,
                    originalType: file.type || 'application/octet-stream',
                    originalSize: file.size,
                    encryptedFile: true,
                    encryptionVersion: encryptedFile.encryptionVersion,
                    salt: encryptedFile.salt,
                    nonce: encryptedFile.nonce,
                    username: currentUsername,
                    channel: activeChannel,
                    timestamp
                });

                addMessage({
                    id: `file_${Date.now()}_${Math.random()}`,
                    type: 'file',
                    username: currentUsername,
                    filename: result.filename,
                    fileUrl: result.fileUrl,
                    originalType: file.type || 'application/octet-stream',
                    originalSize: file.size,
                    encryptedFile: true,
                    encryptionVersion: encryptedFile.encryptionVersion,
                    salt: encryptedFile.salt,
                    nonce: encryptedFile.nonce,
                    decryptedUrl: URL.createObjectURL(file),
                    decryptedFilename: file.name,
                    channel: activeChannel,
                    timestamp,
                    isOwn: true
                });

                setUploadStatus(`Encrypted and uploaded ${file.name}`);
                setTimeout(() => setUploadStatus(''), 3000);
            } else {
                setUploadStatus(result.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Error encrypting/uploading file:', error);
            setUploadStatus('Encrypted upload failed. Check the passphrase and try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const decryptFileMessage = async (message) => {
        if (!message.encryptedFile) return;

        if (!encryptionPassphrase) {
            setUploadStatus('Enter the shared E2EE passphrase to decrypt this file.');
            return;
        }

        if (!cryptoReady) {
            setUploadStatus('Encryption is still loading. Try again in a moment.');
            return;
        }

        setUploadStatus(`Decrypting ${message.filename}...`);

        try {
            const response = await fetch(message.fileUrl);
            const encryptedBytesData = new Uint8Array(await response.arrayBuffer());
            const plainBytes = decryptBytes(
                encryptedBytesData,
                encryptionPassphrase,
                message.salt,
                message.nonce
            );
            const blob = new Blob([plainBytes as unknown as BlobPart], {
                type: message.originalType || 'application/octet-stream'
            });
            const decryptedUrl = URL.createObjectURL(blob);
            const decryptedFilename = message.filename.replace(/\.lsenc$/i, '');

            setMessages(prev => prev.map(item => (
                item.id === message.id
                    ? { ...item, decryptedUrl, decryptedFilename }
                    : item
            )));
            setUploadStatus(`Decrypted ${decryptedFilename}`);
            setTimeout(() => setUploadStatus(''), 3000);
        } catch (error) {
            console.error('File decryption failed:', error);
            setUploadStatus('File decryption failed. Wrong passphrase or damaged file.');
        }
    };

    const handleTyping = () => {
        socketRef.current?.emit('typing_start', { username: currentUsername });
    };

    const handleTypingStop = () => {
        socketRef.current?.emit('typing_stop', { username: currentUsername });
    };

    const dismissAnnouncement = (id) => {
        setAnnouncements(prev => prev.filter(a => a.id !== id));
    };

    const handleJoinConfirm = () => {
        if (!socketRef.current || !joiningChannel) return;
        socketRef.current.emit('join_channel', {
            channel: joiningChannel,
            username: currentUsername,
            password: joinPassword,
            inviteCode: joinInvite
        });
        if (joinPassword) {
            setChannelPasswords({ ...channelPasswords, [joiningChannel]: joinPassword });
        }
        setJoiningChannel(null);
        setJoinPassword('');
        setJoinInvite('');
    };

    // Poll handlers
    const createPoll = (question, options) => {
        if (!socketRef.current) return;
        socketRef.current.emit('create_poll', {
            question,
            options,
            channel: activeChannel,
            username: currentUsername,
            timestamp: new Date().toISOString()
        });
        setShowPollModal(false);
    };

    const votePoll = (pollId, optionIndex) => {
        if (!socketRef.current) return;
        socketRef.current.emit('vote_poll', {
            pollId,
            optionIndex,
            username: currentUsername
        });
    };

    const closePoll = (pollId) => {
        if (!socketRef.current) return;
        socketRef.current.emit('close_poll', {
            pollId,
            username: currentUsername
        });
    };

    // Task handlers
    const createTask = (text) => {
        if (!socketRef.current) return;
        socketRef.current.emit('create_task', {
            text,
            channel: activeChannel,
            username: currentUsername
        });
    };

    const toggleTask = (taskId) => {
        if (!socketRef.current) return;
        socketRef.current.emit('toggle_task', {
            taskId,
            channel: activeChannel
        });
    };

    const deleteTask = (taskId) => {
        if (!socketRef.current) return;
        socketRef.current.emit('delete_task', {
            taskId,
            channel: activeChannel
        });
    };

    // --- Derived state ---

    const visibleMessages = messages.filter(message => {
        if (activeView === 'dm') {
            return message.type === 'private' && message.dmUser === activeDmUser;
        }
        if (message.type === 'private') return false;
        return (message.channel || 'general') === activeChannel;
    });

    const composerDisabled = activeView === 'dm' && !activeDmUser;
    const title = activeView === 'dm' ? `@${activeDmUser || 'direct-messages'}` : activeView === 'notes' ? '📝 Shared Notes' : activeView === 'filebrowser' ? '📂 Remote File Browser' : activeView === 'clipboardsync' ? '📋 Clipboard Sync' : activeView === 'security' ? '🛡️ Security Panel' : activeView === 'calendar' ? '📅 Shared Calendar' : `#${activeChannel}`;

    // --- Render ---

    return (
        <div className="flex flex-col h-screen w-full bg-[#000000] text-[#e5e5e5] overflow-hidden antialiased font-sans">
            <TopNavBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                currentUsername={currentUsername}
                connectionStatus={connectionStatus}
                sidebarOpen={sidebarOpen}
                onToggleSidebar={() => setSidebarOpen((v) => !v)}
                notificationsOpen={notificationsOpen}
                onToggleNotifications={() => setNotificationsOpen((v) => !v)}
                notificationCount={announcements.length + messages.filter((m) => m.type === 'notification').length}
            />

            <div className="flex flex-1 overflow-hidden relative">
                <div
                    className={`flex h-full shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
                        sidebarOpen
                            ? 'w-[256px] opacity-100 translate-x-0'
                            : 'w-0 opacity-0 -translate-x-4 pointer-events-none'
                    }`}
                >
                    <GlobalSidebar
                        activeView={activeView}
                        setActiveView={setActiveView}
                    />

                    <Sidebar
                        activeChannel={activeChannel}
                        setActiveChannel={setActiveChannel}
                        activeView={activeView}
                        setActiveView={setActiveView}
                        connectionStatus={connectionStatus}
                        currentUsername={currentUsername}
                        setCurrentUsername={setCurrentUsername}
                    />
                </div>

                <main className="flex-1 flex flex-col h-full bg-[#000000] relative z-0 min-w-0">
                    <ChatHeader
                        activeView={activeView}
                        activeChannel={activeChannel}
                        title={title}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        isEncrypted={isEncrypted}
                        cryptoReady={cryptoReady}
                        users={users}
                        showLabDrawer={showLabDrawer}
                        onToggleLabDrawer={isLabEnabled ? () => setShowLabDrawer(v => !v) : undefined}
                    />

                    {activeView === 'notes' ? (
                        <SharedNotes socket={socketRef.current} channel={activeChannel} username={currentUsername} onClose={() => setActiveView('server')} />
                    ) : activeView === 'filebrowser' ? (
                        <FileBrowser socket={socketRef.current} username={currentUsername} />
                    ) : activeView === 'clipboardsync' ? (
                        <ClipboardSync socket={socketRef.current} username={currentUsername} />
                    ) : activeView === 'security' ? (
                        <SecurityPanel socket={socketRef.current} channel={activeChannel} username={currentUsername} encryptionPassphrase={encryptionPassphrase} setEncryptionPassphrase={setEncryptionPassphrase} cryptoReady={cryptoReady} />
                    ) : activeView === 'calendar' ? (
                        <Calendar socket={socketRef.current} channel={activeChannel} username={currentUsername} />
                    ) : activeView === 'cryptolab' && isLabEnabled ? (
                        <CryptoLabPage />
                    ) : (
                        <div className="flex-1 flex min-h-0 overflow-hidden">
                            <div className="flex-1 flex flex-col min-w-0">
                                <AnnouncementBanner announcements={announcements} onDismiss={dismissAnnouncement} />
                                <MessageList messages={visibleMessages} searchQuery={searchQuery} messagesEndRef={messagesEndRef} onDecryptFile={decryptFileMessage} onReact={sendReaction} currentUsername={currentUsername} />

                                {activeView === 'server' && polls.length > 0 && (
                                    <div className="absolute right-4 top-16 w-80 space-y-4 max-h-[50vh] overflow-y-auto z-10 scrollbar-thin">
                                        {polls.filter(p => !p.closed).map(poll => (
                                            <Poll key={poll.id} poll={poll} currentUsername={currentUsername} onVote={votePoll} onClose={closePoll} />
                                        ))}
                                    </div>
                                )}

                                {isTyping && (
                                    <div className="px-6 py-1.5 text-xs text-[var(--text-secondary)] italic flex-none animate-pulse">
                                        {typingUser} is typing...
                                    </div>
                                )}

                                {composerDisabled ? (
                                    <div className="p-6 text-center text-[var(--text-secondary)] italic bg-transparent border-t border-[var(--border-subtle)] flex-none">
                                        Choose an online user to start a DM.
                                    </div>
                                ) : (
                                    <div className="flex items-end gap-2 p-3 bg-transparent flex-none relative z-20">
                                        <div className="flex-1 min-w-0">
                                            <MessageComposer
                                                activeChannel={activeChannel}
                                                onSendMessage={sendMessage}
                                                onTyping={handleTyping}
                                                onTypingStop={handleTypingStop}
                                                onFileUpload={handleFileUpload}
                                                isUploading={isUploading}
                                                uploadStatus={uploadStatus}
                                            />
                                        </div>
                                        {activeView === 'server' && (
                                            <button
                                                type="button"
                                                className="h-11 shrink-0 px-3 sm:w-11 sm:px-0 bg-[var(--bg-elevated)] hover:bg-white hover:text-black backdrop-blur-md rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-white/10 text-[var(--text-secondary)] cursor-pointer touch-manipulation"
                                                onClick={() => setShowPollModal(true)}
                                                title="Create Poll"
                                                aria-label="Create poll"
                                            >
                                                📊
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            {isLabEnabled && showLabDrawer && (
                                <div className="w-[46%] min-w-[360px] max-w-[680px] border-l border-[var(--border-subtle)] overflow-y-auto bg-black/40 backdrop-blur-md">
                                    <CryptoLabPage />
                                </div>
                            )}
                        </div>
                    )}
                </main>

                <RightPanel
                    users={users}
                    currentUsername={currentUsername}
                    channelTasks={channelTasks}
                    toggleTask={toggleTask}
                    deleteTask={deleteTask}
                    createTask={createTask}
                    activeView={activeView}
                />

                <aside
                    className={`h-full bg-[#070707]/95 backdrop-blur-md border-l border-white/10 shrink-0 flex flex-col transition-all duration-300 ease-in-out overflow-hidden z-30 ${
                        notificationsOpen ? 'w-72 opacity-100 translate-x-0 p-3' : 'w-0 opacity-0 translate-x-6 pointer-events-none p-0 border-l-0'
                    }`}
                >
                    <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-white/10">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">Notifications</span>
                        <button
                            type="button"
                            onClick={() => setNotificationsOpen(false)}
                            className="text-[11px] font-mono text-zinc-400 hover:text-white px-1.5 py-0.5 border border-white/10 rounded cursor-pointer"
                        >
                            Close
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                        {announcements.map((a) => (
                            <div key={a.id} className="p-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs space-y-1">
                                <div className="text-[10px] font-mono uppercase text-emerald-400">Announcement</div>
                                <div className="text-zinc-200">{a.text || a.content || a.message}</div>
                            </div>
                        ))}
                        {messages
                            .filter((m) => m.type === 'notification')
                            .slice(-20)
                            .reverse()
                            .map((n) => (
                                <div key={n.id} className="p-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-xs space-y-1">
                                    <div className="text-[10px] font-mono text-zinc-500">
                                        {n.channel ? `#${n.channel}` : 'system'}
                                    </div>
                                    <div className="text-zinc-300">{n.content}</div>
                                </div>
                            ))}
                        {announcements.length === 0 && messages.filter((m) => m.type === 'notification').length === 0 && (
                            <div className="text-xs font-mono text-zinc-500 text-center py-8">
                                No notifications yet.
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {showPollModal && (
                <CreatePollModal onSubmit={createPoll} onCancel={() => setShowPollModal(false)} />
            )}

            {showTransferHistory && (
                <TransferHistory onClose={() => setShowTransferHistory(false)} />
            )}

            <JoinChannelModal
                joiningChannel={joiningChannel}
                joinPassword={joinPassword}
                setJoinPassword={setJoinPassword}
                joinInvite={joinInvite}
                setJoinInvite={setJoinInvite}
                setJoiningChannel={setJoiningChannel}
                setActiveChannel={setActiveChannel}
                handleJoinConfirm={handleJoinConfirm}
            />

            {uploadStatus && (
                <SwipeToast
                    title={uploadStatus}
                    open={true}
                    onClose={() => setUploadStatus('')}
                    background="#18181b"
                    color="#f5f5f5"
                    fuseColor={uploadStatus.toLowerCase().includes('fail') ? '#ef4444' : '#22c55e'}
                    duration={3000}
                    closeButton={true}
                />
            )}
        </div>
    );
}

export default App;

