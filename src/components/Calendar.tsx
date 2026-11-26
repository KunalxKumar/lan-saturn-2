import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, Trash2 } from 'lucide-react';

export default function Calendar({ socket, channel, username }) {
    const [events, setEvents] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    
    const [showModal, setShowModal] = useState(false);
    const [eventTitle, setEventTitle] = useState('');
    const [eventDesc, setEventDesc] = useState('');
    const [eventTime, setEventTime] = useState('12:00');

    useEffect(() => {
        if (!socket) return;

        socket.emit('get_events', { channel });

        socket.on('calendar_events_list', (data) => {
            setEvents(data.events || []);
        });

        socket.on('event_created', (event) => {
            if (event.channel === channel) {
                setEvents(prev => [...prev, event]);
            }
        });

        socket.on('event_deleted', (data) => {
            setEvents(prev => prev.filter(evt => evt.id !== data.id));
        });

        return () => {
            socket.off('calendar_events_list');
            socket.off('event_created');
            socket.off('event_deleted');
        };
    }, [socket, channel]);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
    ];

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();

    const handlePrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const dayEvents = useMemo(() => {
        return events.filter(evt => {
            const evtDate = new Date(evt.startTime);
            return evtDate.getFullYear() === selectedDate.getFullYear() &&
                   evtDate.getMonth() === selectedDate.getMonth() &&
                   evtDate.getDate() === selectedDate.getDate();
        });
    }, [events, selectedDate]);

    const daysWithEvents = useMemo(() => {
        const markedDays = new Set();
        events.forEach(evt => {
            const d = new Date(evt.startTime);
            if (d.getFullYear() === year && d.getMonth() === month) {
                markedDays.add(d.getDate());
            }
        });
        return markedDays;
    }, [events, year, month]);

    const handleAddEvent = (e) => {
        e.preventDefault();
        if (!eventTitle.trim()) return;

        const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
        const isoStart = `${dateStr}T${eventTime}:00`;

        socket.emit('create_event', {
            title: eventTitle,
            description: eventDesc,
            startTime: isoStart,
            endTime: '',
            creator: username,
            channel
        });

        setEventTitle('');
        setEventDesc('');
        setShowModal(false);
    };

    const handleDeleteEvent = (id) => {
        if (window.confirm('Delete this event?')) {
            socket.emit('delete_event', { id, channel });
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-transparent text-[var(--text-primary)] p-6 overflow-hidden">
            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* Left Month Calendar Canvas */}
                <div className="flex-1 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl p-5 flex flex-col overflow-hidden">
                    {/* Header Controls */}
                    <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] mb-4 shrink-0">
                        <div className="flex items-center gap-3">
                            <CalendarIcon size={20} className="text-[var(--accent-secure)]" />
                            <h2 className="text-base font-bold text-[var(--text-primary)]">
                                {monthNames[month]} {year}
                            </h2>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button 
                                onClick={handlePrevMonth}
                                className="p-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button 
                                onClick={handleNextMonth}
                                className="p-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                    {/* 7-Column Weekdays Header Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs font-bold text-[var(--text-secondary)] mb-2 py-1 bg-[var(--bg-elevated)] rounded-lg">
                        <div>Sun</div>
                        <div>Mon</div>
                        <div>Tue</div>
                        <div>Wed</div>
                        <div>Thu</div>
                        <div>Fri</div>
                        <div>Sat</div>
                    </div>

                    {/* 7-Column Days Grid */}
                    <div className="grid grid-cols-7 gap-1 flex-1 overflow-y-auto">
                        {Array.from({ length: firstDayIndex }).map((_, i) => (
                            <div key={`empty-${i}`} className="p-2 rounded-lg bg-transparent" />
                        ))}

                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const isSelected = selectedDate.getDate() === day &&
                                               selectedDate.getMonth() === month &&
                                               selectedDate.getFullYear() === year;
                            const isToday = new Date().getDate() === day &&
                                            new Date().getMonth() === month &&
                                            new Date().getFullYear() === year;
                            const hasEvents = daysWithEvents.has(day);

                            return (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDate(new Date(year, month, day))}
                                    className={`relative p-3 rounded-xl flex flex-col items-center justify-between border transition-all ${isSelected ? 'bg-[var(--accent-secure)] border-[var(--accent-secure)] text-[var(--bg-canvas)] font-bold' : isToday ? 'bg-[var(--accent-secure)]/20 border-[var(--accent-secure)] text-[var(--accent-secure)] font-bold' : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
                                >
                                    <span className="text-xs">{day}</span>
                                    {hasEvents && (
                                        <span className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-[var(--accent-secure)]'}`}></span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right Events & Add Form Panel */}
                <div className="w-80 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl p-5 flex flex-col shrink-0 overflow-hidden">
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-4 shrink-0">
                        <div>
                            <h3 className="font-bold text-sm text-[var(--text-primary)]">Events</h3>
                            <p className="text-[11px] font-mono text-[var(--text-secondary)]">{selectedDate.toDateString()}</p>
                        </div>
                        <button 
                            onClick={() => setShowModal(!showModal)}
                            className="p-1.5 rounded-lg bg-[var(--accent-secure)] hover:bg-[#00CC52] text-[var(--bg-canvas)] transition-colors flex items-center justify-center cursor-pointer"
                            title="Add Event"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    {showModal && (
                        <form onSubmit={handleAddEvent} className="mb-4 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-3 space-y-2">
                            <input
                                type="text"
                                placeholder="Event Title..."
                                value={eventTitle}
                                onChange={e => setEventTitle(e.target.value)}
                                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-md px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-secure)]"
                                autoFocus
                            />
                            <input
                                type="time"
                                value={eventTime}
                                onChange={e => setEventTime(e.target.value)}
                                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-md px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-secure)]"
                            />
                            <button type="submit" className="w-full bg-[var(--accent-secure)] hover:bg-[#00CC52] text-[var(--bg-canvas)] text-xs font-semibold py-1.5 rounded-md transition-colors">
                                Save Event
                            </button>
                        </form>
                    )}

                    <div className="flex-1 overflow-y-auto space-y-2">
                        {dayEvents.length === 0 ? (
                            <div className="text-xs text-[var(--text-muted)] italic text-center py-8">No events scheduled for this date.</div>
                        ) : (
                            dayEvents.map(evt => {
                                const evtTime = new Date(evt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                return (
                                    <div key={evt.id} className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-3 flex items-start justify-between group">
                                        <div>
                                            <h4 className="font-bold text-xs text-[var(--text-primary)]">{evt.title}</h4>
                                            <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] font-mono mt-1">
                                                <Clock size={11} />
                                                <span>{evtTime}</span>
                                                <span className="ml-1 text-[var(--accent-secure)]">by {evt.creator}</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteEvent(evt.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-[var(--accent-danger)] transition-opacity"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
