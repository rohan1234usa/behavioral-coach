'use client';

import { useEffect, useState } from 'react';
import { api, ConfidenceData } from '@/services/api';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { Loader2, Trophy, Zap } from 'lucide-react';

export default function ConfidenceGauge() {
    const [data, setData] = useState<ConfidenceData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getConfidenceScore()
            .then(setData)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .catch((err: any) => console.error("Failed to fetch confidence:", err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;
    if (!data) return null;

    const chartData = [
        {
            name: 'Potential',
            value: data.breakdown.potential, // Max 100
            fill: '#10b981', // emerald-500
        },
        {
            name: 'Momentum',
            value: (data.breakdown.momentum / 30) * 100, // Normalize 0-30 to 0-100 for the chart ring
            fill: '#f59e0b', // amber-500
        }
    ];

    return (
        <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-2xl p-6 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -z-10" />

            <div className="flex flex-col md:flex-row items-center gap-8">

                {/* The Gauge */}
                <div className="relative w-48 h-48 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart
                            innerRadius="70%"
                            outerRadius="100%"
                            barSize={10}
                            data={chartData}
                            startAngle={180}
                            endAngle={0}
                        >
                            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                            <RadialBar
                                background
                                dataKey="value"
                                cornerRadius={10}
                                label={false}
                            />
                        </RadialBarChart>
                    </ResponsiveContainer>

                    {/* Center Score */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pb-4">
                        <span className="text-4xl font-bold text-white">{data.score}</span>
                        <span className="text-xs text-gray-400 uppercase tracking-widest">Score</span>
                    </div>
                </div>

                {/* The Details */}
                <div className="flex-1 space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            Are you ready?
                        </h2>
                        <p className="text-emerald-400 font-medium mt-1">
                            "{data.message}"
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                            <div className="flex items-center gap-2 text-gray-400 mb-2">
                                <Trophy className="w-4 h-4 text-emerald-500" />
                                <span className="text-sm">Potential</span>
                            </div>
                            <div className="text-2xl font-bold text-white">{data.breakdown.potential}<span className="text-sm text-gray-500">/100</span></div>
                            <div className="text-xs text-gray-500 mt-1">Top 3 Avg</div>
                        </div>

                        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                            <div className="flex items-center gap-2 text-gray-400 mb-2">
                                <Zap className="w-4 h-4 text-amber-500" />
                                <span className="text-sm">Momentum</span>
                            </div>
                            <div className="text-2xl font-bold text-white">{data.breakdown.recent_sessions}<span className="text-sm text-gray-500">/3</span></div>
                            <div className="text-xs text-gray-500 mt-1">Sessions this week</div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
