import React, { useState, useRef, useEffect } from 'react';
import { Smile, Paperclip } from 'lucide-react';
import VoicePill from '../motion/VoicePill';
import SlingButton from '../motion/SlingButton';

export default function MessageComposer({ activeChannel, onSendMessage, onTyping, onTypingStop, onFileUpload, isUploading, uploadStatus }) {
    const [message, setMessage] = useState('');
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = '24px';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [message]);

    const handleMessageChange = (e) => {
        const value = e.target.value;
        setMessage(value);

        if (value.trim()) {
            onTyping();
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            typingTimeoutRef.current = setTimeout(() => {
                onTypingStop?.();
            }, 1500);
        } else {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            onTypingStop?.();
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleSendMessage = () => {
        if (message.trim()) {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            onTypingStop?.();
            onSendMessage(message);
            setMessage('');
            if (textareaRef.current) {
                textareaRef.current.style.height = '24px';
            }
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && onFileUpload && !isUploading) {
            onFileUpload(file);
            e.target.value = ''; 
        }
    };

    return (
        <div className="flex flex-col w-full px-4 pb-4 max-sm:px-2 max-sm:pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
            {uploadStatus && (
                <div className={`text-xs mb-2 px-2 font-mono ${isUploading ? 'text-[var(--accent-warn)] animate-pulse' : 'text-[var(--text-secondary)]'}`}>
                    {uploadStatus}
                </div>
            )}
            <div className="bg-surface-container border border-outline-variant rounded-xl flex flex-col input-glow transition-all duration-200">
                <textarea
                    ref={textareaRef}
                    placeholder={`Message #${activeChannel}...`}
                    value={message}
                    onChange={handleMessageChange}
                    onKeyDown={handleKeyPress}
                    className="w-full bg-transparent text-body-md text-on-surface placeholder:text-on-surface-variant border-none focus:ring-0 resize-none p-3 max-h-[140px] min-h-[44px] outline-none"
                    rows={1}
                />
                <div className="flex items-center justify-between p-2 pt-0 max-sm:p-1.5 max-sm:pt-0">
                    <div className="flex items-center gap-1">
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                        />
                        <button
                            type="button"
                            className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high p-1.5 rounded-md transition-colors flex items-center justify-center group"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            title="Attach File"
                        >
                            <div className="w-6 h-6 rounded-full bg-[var(--bg-hover)] group-hover:bg-[var(--bg-elevated)] flex items-center justify-center transition-colors">
                                <Paperclip size={14} className="group-hover:text-white transition-colors" />
                            </div>
                        </button>
                        <div className="w-px h-4 bg-outline-variant mx-1" />
                        <button type="button" className="text-on-surface-variant hover:text-ink p-1.5 rounded-md transition-colors" title="Emoji">
                            <Smile size={18} />
                        </button>
                        <VoicePill
                            disabled={isUploading}
                            onSendVoiceNote={(audioFile, durationSec) => {
                                if (audioFile && onFileUpload) {
                                    onFileUpload(audioFile);
                                } else {
                                    onSendMessage(`🎤 Voice note (${durationSec}s)`);
                                }
                            }}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-on-surface-variant hidden sm:inline-block">Markdown supported</span>
                        <SlingButton
                            size={40}
                            tapSends={true}
                            onSend={handleSendMessage}
                            disabled={!message.trim() || isUploading}
                            padColor="#FAFAFA"
                            iconColor="#050505"
                            wellColor="#121216"
                            bandColor="#32323D"
                            accentColor="#00FF66"
                            ariaLabel="Send Message"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
