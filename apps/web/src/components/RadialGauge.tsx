import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface RadialGaugeProps {
    value: number;
    label: string;
    color?: string; // Hex color
    className?: string;
}

export function RadialGauge({ value, label, color = "#00F0FF", className }: RadialGaugeProps) {
    const radius = 40;
    const stroke = 6;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (value / 100) * circumference;

    // Pulse animation if value is high (> 80)
    const isHigh = value > 80;

    return (
        <div className={twMerge("flex flex-col items-center justify-center", className)}>
            <div className="relative w-32 h-32 flex items-center justify-center">
                {/* Background Circle */}
                <svg
                    height="100%"
                    width="100%"
                    className="transform -rotate-90 pointer-events-none"
                >
                    <circle
                        stroke="#1F2937"
                        strokeWidth={stroke}
                        fill="transparent"
                        r={normalizedRadius}
                        cx="50%"
                        cy="50%"
                        strokeLinecap="round"
                        className="opacity-50"
                    />
                    {/* Progress Circle */}
                    <circle
                        stroke={color}
                        strokeDasharray={circumference + ' ' + circumference}
                        style={{
                            strokeDashoffset,
                            filter: isHigh ? `drop-shadow(0 0 8px ${color})` : 'none',
                            transition: 'stroke-dashoffset 0.5s ease-in-out, filter 0.3s ease'
                        }}
                        strokeWidth={stroke}
                        fill="transparent"
                        r={normalizedRadius}
                        cx="50%"
                        cy="50%"
                        strokeLinecap="round"
                        className={clsx(isHigh && "animate-pulse")}
                    />
                </svg>

                {/* Inner Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-heading font-bold neon-text" style={{ color }}>
                        {value}
                    </span>
                </div>
            </div>

            <span className="mt-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
                {label}
            </span>
        </div>
    );
}
