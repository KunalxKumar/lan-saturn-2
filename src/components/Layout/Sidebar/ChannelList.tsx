import React from 'react';
import LineSidebar from '../../motion/LineSidebar';

const CHANNELS = [
    { id: 'general', label: 'General' },
    { id: 'random', label: 'Random' },
    { id: 'study', label: 'Study' },
    { id: 'files', label: 'Files' }
];

export default function ChannelList({ activeChannel, setActiveChannel, activeView, setActiveView }) {
    const activeIndex =
        activeView === 'server'
            ? CHANNELS.findIndex((c) => c.id === activeChannel)
            : -1;

    return (
        <div className="mb-3">
            <div className="text-[10px] font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 px-2">
                Channels
            </div>
            <LineSidebar
                key={`${activeView}-${activeChannel}`}
                className="line-sidebar--channels"
                items={CHANNELS.map((c) => c.label)}
                defaultActive={activeIndex >= 0 ? activeIndex : null}
                onItemClick={(index) => {
                    setActiveChannel(CHANNELS[index].id);
                    setActiveView('server');
                }}
                accentColor="#FFFFFF"
                textColor="#A1A1AA"
                markerColor="#32323D"
                showIndex={false}
                showMarker
                proximityRadius={70}
                maxShift={10}
                falloff="smooth"
                markerLength={16}
                markerGap={8}
                tickScale={0.5}
                scaleTick
                itemGap={4}
                fontSize={0.78}
                smoothing={90}
            />
        </div>
    );
}
