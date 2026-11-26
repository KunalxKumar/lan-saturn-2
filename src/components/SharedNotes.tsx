import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, FileText, Eye, Edit3 } from 'lucide-react';

/**
 * SharedNotes - Collaborative real-time markdown notes.
 */
export default function SharedNotes({ socket, channel, username, onClose }) {
    const [notes, setNotes] = useState([]);
    const [activeNote, setActiveNote] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [newNoteName, setNewNoteName] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [isEditing, setIsEditing] = useState(true);
    const [lastUpdater, setLastUpdater] = useState('');

    const textareaRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        if (!socket) return;
        socket.emit('get_notes', { channel });

        socket.on('notes_list', (data) => {
            if (data.channel === channel) {
                setNotes(data.notes || []);
                if (data.notes && data.notes.length > 0 && !activeNote) {
                    selectNote(data.notes[0]);
                }
            }
        });

        socket.on('note_content', (data) => {
            if (data.channel === channel && data.noteName === activeNote) {
                setNoteContent(data.content);
            }
        });

        socket.on('note_updated', (data) => {
            if (data.channel === channel && data.noteName === activeNote) {
                setLastUpdater(data.username);
                if (textareaRef.current && document.activeElement === textareaRef.current) {
                    const start = textareaRef.current.selectionStart;
                    const end = textareaRef.current.selectionEnd;
                    setNoteContent(data.content);
                    setTimeout(() => {
                        if (textareaRef.current) {
                            textareaRef.current.selectionStart = start;
                            textareaRef.current.selectionEnd = end;
                        }
                    }, 0);
                } else {
                    setNoteContent(data.content);
                }
            }
        });

        socket.on('note_deleted', (data) => {
            if (data.channel === channel && data.noteName === activeNote) {
                setActiveNote('');
                setNoteContent('');
            }
        });

        return () => {
            socket.off('notes_list');
            socket.off('note_content');
            socket.off('note_updated');
            socket.off('note_deleted');
        };
    }, [socket, channel, activeNote]);

    const selectNote = (noteName) => {
        setActiveNote(noteName);
        setNoteContent('');
        setLastUpdater('');
        socket.emit('get_note_content', { channel, noteName });
    };

    const handleTextChange = (e) => {
        const val = e.target.value;
        setNoteContent(val);

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('save_note', {
                channel,
                noteName: activeNote,
                content: val,
                username
            });
        }, 150);
    };

    const handleCreateNote = (e) => {
        e.preventDefault();
        if (!newNoteName.trim()) return;
        socket.emit('create_note', { channel, noteName: newNoteName.trim(), username });
        setActiveNote(newNoteName.trim());
        setNewNoteName('');
        setShowCreateForm(false);
    };

    const handleDeleteNote = (noteName) => {
        if (window.confirm(`Delete note "${noteName}"?`)) {
            socket.emit('delete_note', { channel, noteName });
        }
    };

    return (
        <div className="flex flex-1 h-full bg-transparent text-[var(--text-primary)] overflow-hidden">
            {/* Left Notes List Sidebar */}
            <div className="w-64 bg-transparent border-r border-[var(--border-subtle)] flex flex-col p-4 shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <span className="font-bold text-sm text-[var(--text-primary)]">Shared Notes</span>
                    <button 
                        className="p-1.5 rounded-lg bg-[var(--accent-secure)] hover:bg-[#00CC52] text-[var(--bg-canvas)] transition-colors flex items-center justify-center cursor-pointer"
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        title="Create Note"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                {showCreateForm && (
                    <form className="mb-4 flex flex-col gap-2" onSubmit={handleCreateNote}>
                        <input
                            type="text"
                            placeholder="Note title..."
                            value={newNoteName}
                            onChange={e => setNewNoteName(e.target.value)}
                            maxLength={50}
                            className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-md px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-gray-500 outline-none focus:border-[var(--accent-secure)]"
                            autoFocus
                        />
                        <button type="submit" className="w-full bg-[var(--accent-secure)] hover:bg-[#00CC52] text-[var(--bg-canvas)] text-xs font-semibold py-1 rounded-md transition-colors">
                            Create Note
                        </button>
                    </form>
                )}

                <div className="flex-1 overflow-y-auto space-y-1">
                    {notes.length === 0 ? (
                        <div className="text-xs text-[var(--text-muted)] italic text-center py-6">No notes found. Click + to create one.</div>
                    ) : (
                        notes.map(note => {
                            const isActive = activeNote === note;
                            return (
                                <div key={note} className={`group flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors ${isActive ? 'bg-[var(--accent-secure)]/20 text-[var(--accent-secure)] border-l-2 border-[var(--accent-secure)] font-semibold' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'}`}>
                                    <button className="flex items-center gap-2 flex-1 truncate text-xs text-left" onClick={() => selectNote(note)}>
                                        <FileText size={14} className="shrink-0" />
                                        <span className="truncate">{note}</span>
                                    </button>
                                    <button 
                                        className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-[var(--accent-danger)] transition-opacity" 
                                        onClick={() => handleDeleteNote(note)}
                                        title="Delete note"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Right Note Editor Area */}
            <div className="flex-1 flex flex-col h-full bg-transparent p-6 overflow-hidden">
                {activeNote ? (
                    <div className="flex flex-col h-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[var(--border-subtle)] shrink-0">
                            <div className="flex items-center gap-2">
                                <FileText size={18} className="text-[var(--accent-secure)]" />
                                <h2 className="text-base font-bold text-[var(--text-primary)]">{activeNote}</h2>
                            </div>
                            <div className="flex items-center gap-3">
                                {lastUpdater && (
                                    <span className="text-xs text-[var(--text-secondary)] font-mono">Last edit by: {lastUpdater}</span>
                                )}
                                <button 
                                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg border transition-colors ${isEditing ? 'bg-[var(--accent-secure)] text-[var(--bg-canvas)] border-[var(--accent-secure)]' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]'}`} 
                                    onClick={() => setIsEditing(!isEditing)}
                                >
                                    {isEditing ? <><Eye size={13} /> Preview</> : <><Edit3 size={13} /> Edit</>}
                                </button>
                            </div>
                        </div>

                        {isEditing ? (
                            <textarea
                                ref={textareaRef}
                                className="flex-1 w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg p-4 text-xs font-mono text-[var(--text-primary)] placeholder-gray-500 outline-none focus:border-[var(--accent-secure)] resize-none leading-relaxed"
                                value={noteContent}
                                onChange={handleTextChange}
                                placeholder="Write markdown notes here..."
                            />
                        ) : (
                            <div className="flex-1 overflow-y-auto p-4 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg text-xs leading-relaxed space-y-2">
                                {noteContent ? (
                                    noteContent.split('\n').map((line, i) => {
                                        if (line.startsWith('# ')) return <h1 key={i} className="text-lg font-bold text-white border-b border-[var(--border-strong)] pb-1 mt-2">{line.slice(2)}</h1>;
                                        if (line.startsWith('## ')) return <h2 key={i} className="text-sm font-bold text-[var(--accent-secure)] mt-2">{line.slice(3)}</h2>;
                                        if (line.startsWith('### ')) return <h3 key={i} className="text-xs font-bold text-[var(--text-secondary)] mt-1">{line.slice(4)}</h3>;
                                        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 text-[var(--text-secondary)]">{line.slice(2)}</li>;
                                        if (line.trim() === '') return <br key={i} />;
                                        return <p key={i} className="text-[var(--text-secondary)]">{line}</p>;
                                    })
                                ) : (
                                    <p className="text-[var(--text-muted)] italic">Empty note. Click Edit to write content.</p>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl">
                        <FileText size={48} className="text-[var(--text-muted)] mb-3" />
                        <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">Collaborative Shared Notes</h3>
                        <p className="text-xs text-[var(--text-secondary)] max-w-sm">Select an existing note from the left sidebar or create a new note to start real-time editing.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
