'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';
import { api, CoachingPlanData } from '@/services/api';
import ConfidenceGauge from '@/components/ConfidenceGauge';
import InteractiveParticles from '@/components/InteractiveParticles';
import ReactMarkdown from 'react-markdown';
import { Square, ArrowUpRight, Grid, List, Lock, Target, TrendingUp, Zap } from 'lucide-react';
import {
    ResponsiveContainer,
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    Tooltip
} from 'recharts';

type MetricKey = 'confidence' | 'clarity' | 'resilience' | 'engagement';

type DashboardSession = {
    id: number;
    display_id: number;
    question_text: string;
    status: string;
    created_at: string;
    confidence_score?: number | null;
    clarity_score?: number | null;
    resilience_score?: number | null;
    engagement_score?: number | null;
};

type DotPoint = {
    x: number;
    y: number;
    z: number;
};

type ApiError = {
    response?: {
        data?: {
            detail?: string;
        };
    };
};

// Minimalist "Dot Plot": Just points on a line to show distribution
const generateDotData = (count: number) => {
    return Array.from({ length: count }).map((_, i) => ({
        x: i,
        y: 50 + Math.random() * 50,
        z: 1
    }));
};

export default function Dashboard() {
    const { status } = useSession();
    const [sessions, setSessions] = useState<DashboardSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [coachingPlan, setCoachingPlan] = useState<CoachingPlanData | null>(null);
    const [generatingPlan, setGeneratingPlan] = useState(false);
    const [mounted, setMounted] = useState(false);
    
    // Customization inputs
    const [targetRole, setTargetRole] = useState("Software Engineer");
    const [company, setCompany] = useState("FAANG");

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (status === 'authenticated') {
            Promise.all([
                api.getSessions().then(data => setSessions(data)),
                api.getCoachingPlan().then(res => setCoachingPlan(res.data))
            ])
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
        } else if (status === 'unauthenticated') {
            setLoading(false);
        }
    }, [status]);

    const handleGeneratePlan = async () => {
        setGeneratingPlan(true);
        try {
            await api.generateCoachingPlan(targetRole, company);
            const res = await api.getCoachingPlan();
            setCoachingPlan(res.data);
        } catch (err: unknown) {
            console.error("Failed to generate plan:", err);
            alert((err as ApiError).response?.data?.detail || "Failed to generate plan. Ensure you have completed at least one session.");
        } finally {
            setGeneratingPlan(false);
        }
    };

    if (!mounted || status === 'loading' || (status === 'authenticated' && loading)) return (
        <InteractiveParticles 
            text="Retrieving Archive..." 
        />
    );

    if (status === 'unauthenticated') return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6">
            <div className="max-w-md text-center flex flex-col items-center gap-6">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                    <Lock className="w-8 h-8 text-muted-foreground" />
                </div>
                <h1 className="text-3xl font-sans font-bold">Authentication Required</h1>
                <p className="text-muted-foreground">
                    Your performance history is secured. Sign in to access your interview archives and analysis data.
                </p>
                <button
                    onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                    className="px-8 py-3 bg-primary text-background font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
                >
                    Sign In to Access
                </button>
            </div>
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

            {/* METRICS GRID: Aggregated averages from real sessions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                {(['confidence', 'clarity', 'resilience', 'engagement'] as const).map((metric: MetricKey) => {
                    const scoreKey = `${metric}_score` as const;
                    const completed = sessions.filter(s => s.status === 'completed' && s[scoreKey] != null);
                    const avgRaw = completed.length > 0
                        ? (completed.reduce((sum: number, s) => {
                            const rawScore = s[scoreKey];
                            let val = typeof rawScore === 'number' ? rawScore : 0;
                            if (val > 1) val = val / 100; // Recover legacy unbounded
                            return sum + val;
                        }, 0) / completed.length)
                        : null;
                        
                    const avg = avgRaw !== null ? Math.max(0, Math.min(100, Math.round(avgRaw * 100))) : null;
                    
                    const dotData = completed.map((s, i) => {
                        const rawScore = s[scoreKey];
                        let val = typeof rawScore === 'number' ? rawScore : 0;
                        if (val > 1) val = val / 100;
                        return { x: i, y: Math.max(0, Math.min(100, Math.round(val * 100))), z: 1 };
                    });
                    return (
                        <MetricCard
                            key={metric}
                            title={metric.charAt(0).toUpperCase() + metric.slice(1)}
                            value={avg !== null ? `${avg}%` : '—'}
                            data={dotData.length > 0 ? dotData : generateDotData(5)}
                            color="#292524"
                        />
                    );
                })}
            </div>

            {/* AI COACHING & BENCHMARKING SECTION */}
            <div className="mb-16">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h2 className="text-2xl font-sans font-bold uppercase tracking-tight flex items-center gap-2">
                            <Target className="w-6 h-6 text-accent" /> AI Coaching & Benchmark
                        </h2>
                        <p className="text-sm text-muted-foreground font-mono mt-2">
                            Curriculum automatically targets your identified weaknesses in future Arena sessions.
                        </p>
                    </div>
                    {!coachingPlan && !generatingPlan && sessions.filter(s => s.status === 'completed').length > 0 && (
                        <div className="flex flex-col gap-3 items-end">
                            <div className="flex gap-4 text-xs font-mono text-muted-foreground mr-1">
                                <label className="flex items-center gap-2">
                                    Role: <input type="text" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="Software Engineer" className="bg-surface border border-border px-2 py-1 rounded text-foreground w-40" />
                                </label>
                                <label className="flex items-center gap-2">
                                    Company: <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="FAANG" className="bg-surface border border-border px-2 py-1 rounded text-foreground w-32" />
                                </label>
                            </div>
                            <button 
                                onClick={handleGeneratePlan}
                                className="bg-accent text-background px-4 py-2 font-bold font-sans text-sm uppercase tracking-widest hover:opacity-90 transition-opacity"
                            >
                                Analyze History & Generate Plan
                            </button>
                        </div>
                    )}
                    {coachingPlan && !generatingPlan && (
                        <div className="flex flex-col gap-3 items-end">
                            <div className="flex gap-4 text-xs font-mono text-muted-foreground mr-1">
                                <label className="flex items-center gap-2">
                                    Role: <input type="text" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="Software Engineer" className="bg-surface border border-border px-2 py-1 rounded text-foreground w-40" />
                                </label>
                                <label className="flex items-center gap-2">
                                    Company: <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="FAANG" className="bg-surface border border-border px-2 py-1 rounded text-foreground w-32" />
                                </label>
                            </div>
                            <button 
                                onClick={handleGeneratePlan}
                                className="text-xs font-mono text-muted-foreground hover:text-foreground border border-border px-3 py-1 bg-surface hover:bg-secondary transition-colors w-full"
                            >
                                Regenerate Plan
                            </button>
                        </div>
                    )}
                </div>

                {generatingPlan && (
                    <div className="stacked-card p-12 flex flex-col items-center justify-center gap-4 text-center">
                        <InteractiveParticles text="Simulating FAANG Benchmark..." subtext="Analyzing your historical metrics and generating a targeted action plan." />
                    </div>
                )}

                {!generatingPlan && coachingPlan && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Industry Benchmark */}
                        <div className="stacked-card p-6 bg-surface shadow-sm hover:shadow-md transition-shadow">
                            <h3 className="text-sm font-sans font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2 border-b border-border pb-2">
                                <TrendingUp className="w-4 h-4 text-primary" /> Industry Benchmark
                            </h3>
                            <div className="font-mono text-xs uppercase tracking-widest text-accent mb-3 bg-accent/10 inline-block px-2 py-1">Target Role: {coachingPlan.target_role}</div>
                            <p className="font-body text-sm leading-relaxed text-foreground/90">
                                {coachingPlan.industry_benchmark_notes}
                            </p>
                        </div>

                        {/* Identified Weakness & Action Plan */}
                        <div className="stacked-card p-6 border border-accent/30 bg-accent/5 hover:border-accent transition-colors">
                            <h3 className="text-sm font-sans font-bold uppercase tracking-widest text-accent mb-4 flex items-center gap-2 border-b border-accent/20 pb-2">
                                <Zap className="w-4 h-4" /> Core Weakness & Action Plan
                            </h3>
                            <div className="mb-4">
                                <span className="font-sans font-semibold text-sm text-foreground">Identified Weakness: </span>
                                <span className="font-mono text-sm text-destructive capitalize">
                                    {coachingPlan.core_weakness.replace(/^(Identified Weakness:\s*|Weakness:\s*|\*+|\#+)/ig, '').trim()}
                                </span>
                            </div>
                            <div className="text-foreground/90">
                                <ReactMarkdown
                                    components={{
                                        h1: ({node, ...props}) => { void node; return <h1 className="text-xl font-bold font-sans text-foreground mt-4 mb-2" {...props} />; },
                                        h2: ({node, ...props}) => { void node; return <h2 className="text-lg font-bold font-sans text-foreground mt-4 mb-2" {...props} />; },
                                        h3: ({node, ...props}) => { void node; return <h3 className="text-md font-bold font-sans text-foreground mt-3 mb-2" {...props} />; },
                                        p: ({node, ...props}) => { void node; return <p className="mb-3 text-sm font-body leading-relaxed" {...props} />; },
                                        ul: ({node, ...props}) => { void node; return <ul className="list-none pl-0 mb-4 space-y-3" {...props} />; },
                                        ol: ({node, ...props}) => { void node; return <ol className="list-decimal pl-5 mb-4 space-y-3 text-sm font-body text-muted-foreground" {...props} />; },
                                        li: ({node, ...props}) => {
                                            void node;
                                            return (
                                                <li className="text-sm font-body text-muted-foreground flex items-start gap-2 relative" {...props}>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-1.5" />
                                                    <div>{props.children}</div>
                                                </li>
                                            );
                                        },
                                        strong: ({node, ...props}) => { void node; return <strong className="font-semibold font-sans text-foreground" {...props} />; },
                                    }}
                                >
                                    {coachingPlan.action_plan}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                )}

                {!generatingPlan && !coachingPlan && sessions.filter(s => s.status === 'completed').length === 0 && (
                     <div className="stacked-card p-8 border border-border border-dashed flex items-center justify-center text-center bg-secondary/20">
                     <p className="text-muted-foreground font-mono text-sm">
                         Complete at least one interview session in the Arena to unlock AI Coaching & Benchmarking.
                     </p>
                 </div>
                )}
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
                            {sessions.map((session) => (
                                <tr key={session.id} className="hover:bg-secondary/30 transition-colors group">
                                    <td className="p-6 text-muted-foreground">#{session.display_id.toString().padStart(3, '0')}</td>
                                    <td className="p-6 font-medium text-foreground max-w-xs truncate">
                                        {session.question_text || 'Untitled Session'}
                                    </td>
                                    <td className="p-6 text-muted-foreground">
                                        {new Date(session.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-6 text-right">
                                        {session.status === 'completed' ? (
                                            <Link href={`/results/${session.id}`} className="inline-flex items-center gap-1 text-xs font-bold uppercase text-primary border-b border-transparent group-hover:border-primary transition-all">
                                                View <ArrowUpRight className="w-3 h-3" />
                                            </Link>
                                        ) : (
                                            <span className="text-xs uppercase tracking-widest text-muted-foreground font-mono">{session.status}</span>
                                        )}
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

function MetricCard({ title, value, data, color }: { title: string, value: string, data: DotPoint[], color: string }) {
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