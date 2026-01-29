import React from 'react';
import { twMerge } from 'tailwind-merge';

interface SparklineProps {
    data: number[];
    color?: string;
    height?: number;
    className?: string;
}

export function Sparkline({ data, color = "#00F0FF", height = 60, className }: SparklineProps) {
    if (!data || data.length === 0) return null;

    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min;

    // Normalize points
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((val - min) / range) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className={twMerge("w-full relative overflow-hidden", className)} style={{ height }}>
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="overflow-visible"
            >
                {/* Gradient Definition */}
                <defs>
                    <linearGradient id={`gradient-${color}`} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.5" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Area under the curve */}
                <polyline
                    fill={`url(#gradient-${color})`}
                    stroke="none"
                    points={`${points} 100,100 0,100`}
                />

                {/* The Sparkline itself */}
                <polyline
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    points={points}
                    vectorEffect="non-scaling-stroke"
                    className="drop-shadow-[0_0_4px_rgba(0,0,0,0.5)]"
                />

                {/* Pulse dot at the end */}
                {data.length > 0 && (
                    <circle
                        cx="100%"
                        cy={`${100 - ((data[data.length - 1] - min) / range) * 100}%`}
                        r="3"
                        fill={color}
                        className="animate-ping"
                    />
                )}
            </svg>
        </div>
    );
}
