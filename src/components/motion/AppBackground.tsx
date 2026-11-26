import React, { Suspense } from 'react';

const GridScan = React.lazy(() => import('./GridScan'));

interface AppBackgroundProps {
    /** Overall strength of the animated grid behind the app. */
    opacity?: number;
}

/**
 * Global animated backdrop shared by every view.
 * Mirrors the Crypto Lab background so the whole app feels like one surface.
 */
export default function AppBackground({ opacity = 0.3 }: AppBackgroundProps) {
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-0"
            style={{ opacity }}
        >
            <Suspense fallback={null}>
                <GridScan
                    linesColor="#32323D"
                    scanColor="#00FF66"
                    cells={10}
                    depth={3}
                    depthFade={0.8}
                    lineThickness={0.7}
                    lineStyle="solid"
                    parallax={0.15}
                    shading={0.35}
                    reflection={0.1}
                    points={false}
                    scanDirection="forward"
                    scanDuration={4}
                    scanDelay={3}
                    scanWidth={0.5}
                    trail={0.15}
                    glow={0.1}
                    autoScan={true}
                    interactive={false}
                    clickEffect="none"
                    dpr={1}
                />
            </Suspense>
        </div>
    );
}
