'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/services/api';
import ConfidenceGauge from '@/components/ConfidenceGauge';
import { Square, ArrowUpRight, Grid, List } from 'lucide-react';
import {
    ResponsiveContainer,
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    ZAxis,
    Tooltip,
    Cell
} from 'recharts';

// --- MOCK DATA FOR DOT PLOTS ---
// Minimalist "Dot Plot": Just points on a line to show distribution
const generateDotData = (count: number) => {
    return Array.from({ length: count }).map((_, i) => ({
        x: i,
        y: 50 + Math.random() * 50,
        z: 1 // uniform size
    }));
};

const mockData = generateDotData(20);

export default function Dashboard() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getSessions()
            .then(data => setSessions(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground font-sans uppercase tracking-[0.2em] text-xs">
            Retrieving Archive...
        </div>
    );

    return (
        <div className="min-h-screen bg-background text-foreground font-body p-6 md:p-12 max-w-7xl mx-auto">

            {/* HEADER */}
            <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-2 border-primary/5 pb-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-sans font-bold text-foreground mb-2">History</h1>
                    <p className="text-muted-foreground max-w-md">
                        A collection of behavioral artifacts. Quantitative analysis of human performance metrics.
                    </p>
                </div>
                <div className="flex gap-4">
                    <Link href="/arena" className="stone-button inline-flex items-center gap-2">
                        <Square className="w-3 h-3 fill-current" />
                        Record New
                    </Link>
                </div>
            </header>

            {/* CONFIDENCE NORTH STAR */}
            <div className="mb-16 animate-fade-in-up">
                <ConfidenceGauge />
            </div>

            {/* METRICS GRID: "CARD CATALOG" */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                <MetricCard title="Confidence" value="82%" data={mockData} color="#292524" />
                <MetricCard title="Clarity" value="94%" data={mockData} color="#292524" />
                <MetricCard title="Resilience" value="71%" data={mockData} color="#B91C1C" />
                <MetricCard title="Engagement" value="88%" data={mockData} color="#059669" />
            </div>

            {/* INDEX TABLE */}
            <div className="stacked-card p-0 overflow-hidden">
                <div className="border-b border-border p-6 flex justify-between items-center bg-background">
                    <h2 className="text-lg font-sans font-bold uppercase tracking-tight">Session Index</h2>
                    <div className="flex gap-2">
                        <button className="p-2 hover:bg-secondary rounded-sm transition-colors"><Grid className="w-4 h-4 text-muted-foreground" /></button>
                        <button className="p-2 bg-secondary rounded-sm transition-colors"><List className="w-4 h-4 text-foreground" /></button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-border text-xs font-sans font-bold uppercase tracking-widest text-muted-foreground">
                                <th className="p-6 w-32">ID</th>
                                <th className="p-6">Topic / Prompt</th>
                                <th className="p-6 w-48">Date Recorded</th>
                                <th className="p-6 w-32 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50 font-mono text-sm">
                            {sessions.map((session, i) => (
                                <tr key={session.id} className="hover:bg-secondary/30 transition-colors group">
                                    <td className="p-6 text-muted-foreground">#{i.toString().padStart(3, '0')}</td>
                                    <td className="p-6 font-medium text-foreground">
                                        {session.transcript || "Untitled Session Analysis"}
                                    </td>
                                    <td className="p-6 text-muted-foreground">
                                        {new Date(session.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-6 text-right">
                                        <Link href={`/results/${session.id}`} className="inline-flex items-center gap-1 text-xs font-bold uppercase text-primary border-b border-transparent group-hover:border-primary transition-all">
                                            View <ArrowUpRight className="w-3 h-3" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {sessions.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-muted-foreground italic">
                                        Archive is empty. Initialize a recording in The Arena.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}

function MetricCard({ title, value, data, color }: { title: string, value: string, data: any[], color: string }) {
    return (
        <div className="stacked-card p-6 flex flex-col justify-between h-48 hover:translate-y-[-2px] transition-transform duration-300">
            <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-sans">{title}</span>
                <span className="text-3xl font-mono font-medium text-foreground tracking-tighter">{value}</span>
            </div>

            {/* Minimal Dot Plot */}
            <div className="h-16 w-full mt-4 border-b border-border relative">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
                        <XAxis type="number" dataKey="x" hide domain={['dataMin', 'dataMax']} />
                        <YAxis type="number" dataKey="y" hide domain={[0, 100]} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={() => null} />
                        <Scatter data={data} fill={color} shape="square" />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-2 text-[10px] text-muted-foreground font-mono flex justify-between">
                <span>Start</span>
                <span>End</span>
            </div>
        </div>
    );
}