'use client';

import React from 'react';
import { AnalysisData } from '@/services/api';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    AreaChart,
    Area
} from 'recharts';

interface PDFReportProps {
    data: AnalysisData;
    sessionId: string;
}

const PDFReport: React.FC<PDFReportProps> = ({ data, sessionId }) => {
    const metrics = [
        { label: 'Confidence', value: data.confidence_score },
        { label: 'Clarity', value: data.clarity_score },
        { label: 'Resilience', value: data.resilience_score },
        { label: 'Engagement', value: data.engagement_score },
    ];

    // Standard hex colors to bypass Tailwind 4 OKLCH issues with html2canvas
    const colors = {
        white: '#FFFFFF',
        slate50: '#F8FAFC',
        slate100: '#F1F5F9',
        slate200: '#E2E8F0',
        slate300: '#CBD5E1',
        slate400: '#94A3B8',
        slate500: '#64748B',
        slate700: '#334155',
        slate900: '#0F172A',
        green100: '#DCFCE7',
        green500: '#22C55E',
        green700: '#15803D',
        orange100: '#FFEDD5',
        orange700: '#C2410C',
        red100: '#FEE2E2',
        red500: '#EF4444',
        red700: '#B91C1C',
    };

    return (
        <div
            id="pdf-report-content"
            className="p-12 w-[800px] font-sans antialiased"
            style={{ backgroundColor: colors.white, color: colors.slate900 }}
        >
            {/* HEADER */}
            <div
                className="pb-8 mb-12 flex justify-between items-end"
                style={{ borderBottom: `4px solid ${colors.slate900}` }}
            >
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Behavioral Analysis Report</h1>
                    <p className="font-mono text-sm tracking-widest" style={{ color: colors.slate400 }}>PHASE II // DIAGNOSTIC AUDIT</p>
                </div>
                <div className="text-right font-mono text-xs" style={{ color: colors.slate400 }}>
                    <p>ID: {sessionId}</p>
                    <p>DATE: {new Date(data.created_at).toLocaleDateString()}</p>
                </div>
            </div>

            {/* CANDIDATE INFO */}
            <div
                className="mb-12 p-6"
                style={{ backgroundColor: colors.slate50, borderLeft: `4px solid ${colors.slate900}` }}
            >
                <h2 className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: colors.slate400 }}>Subject</h2>
                <p className="text-2xl font-bold uppercase">{data.candidate_name || 'Candidate'}</p>
            </div>

            {/* EXECUTIVE SUMMARY */}
            <div className="mb-12">
                <h2 className="text-sm font-bold uppercase tracking-widest pb-2 mb-4" style={{ borderBottom: `1px solid ${colors.slate200}` }}>Executive Summary</h2>
                <p className="text-lg leading-relaxed italic" style={{ color: colors.slate700 }}>
                    "{data.summary || 'No summary available for this session.'}"
                </p>
            </div>

            {/* METRICS GRID */}
            <div className="grid grid-cols-2 gap-8 mb-12">
                {metrics.map((m) => (
                    <div
                        key={m.label}
                        className="p-6 flex flex-col justify-between"
                        style={{ border: `1px solid ${colors.slate200}` }}
                    >
                        <span className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: colors.slate400 }}>{m.label}</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-mono font-medium tracking-tighter">{Math.round(m.value * 100)}%</span>
                            <span
                                className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                                style={{
                                    backgroundColor: m.value >= 0.7 ? colors.green100 : m.value >= 0.45 ? colors.orange100 : colors.red100,
                                    color: m.value >= 0.7 ? colors.green700 : m.value >= 0.45 ? colors.orange700 : colors.red700
                                }}
                            >
                                {m.value >= 0.7 ? 'Optimal' : m.value >= 0.45 ? 'Warning' : 'Critical'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* EMOTIONAL AMPLITUDE */}
            <div className="mb-12">
                <h2 className="text-sm font-bold uppercase tracking-widest pb-2 mb-6" style={{ borderBottom: `1px solid ${colors.slate200}` }}>Emotional Dynamics</h2>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.metrics_data?.timeline || []}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.slate200} />
                            <XAxis dataKey="timestamp" hide />
                            <YAxis domain={[0, 100]} stroke={colors.slate400} fontSize={10} />
                            <Line type="step" dataKey="tone" stroke={colors.slate900} strokeWidth={3} dot={false} isAnimationActive={false} />
                            <Line type="monotone" dataKey="energy" stroke={colors.slate400} strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-8 mt-4 font-mono text-[10px] uppercase" style={{ color: colors.slate400 }}>
                    <span className="flex items-center gap-2"><div className="w-3 h-3" style={{ backgroundColor: colors.slate900 }}></div> Tone (Positivity)</span>
                    <span className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-dashed" style={{ borderColor: colors.slate300 }}></div> Energy (Intensity)</span>
                </div>
            </div>

            {/* TRANSCRIPT & SPIKES */}
            <div className="mb-12 grid grid-cols-2 gap-8 page-break-before">
                {/* Transcript */}
                <div>
                    <h2 className="text-sm font-bold uppercase tracking-widest pb-2 mb-4" style={{ borderBottom: `1px solid ${colors.slate200}` }}>Session Transcript</h2>
                    <div className="space-y-3">
                        {data.metrics_data?.transcript_segments && data.metrics_data.transcript_segments.length > 0 ? (
                            data.metrics_data.transcript_segments.map((seg: any, idx: number) => (
                                <div key={idx} className="flex gap-3">
                                    <span className="text-[10px] font-mono mt-0.5" style={{ color: colors.slate400 }}>
                                        {new Date(seg.start * 1000).toISOString().substr(14, 5)}
                                    </span>
                                    <p className="text-xs leading-relaxed" style={{ color: colors.slate700 }}>{seg.text}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs italic" style={{ color: colors.slate500 }}>{data.transcript || "No transcript available."}</p>
                        )}
                    </div>
                </div>

                {/* Emotional Highlights */}
                <div>
                    <h2 className="text-sm font-bold uppercase tracking-widest pb-2 mb-4" style={{ borderBottom: `1px solid ${colors.slate200}` }}>Emotional Highlights</h2>
                    <div className="space-y-3">
                        {data.metrics_data?.emotional_spikes && data.metrics_data.emotional_spikes.length > 0 ? (
                            data.metrics_data.emotional_spikes.map((spike: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center p-3 rounded" style={{ backgroundColor: colors.slate50, border: `1px solid ${colors.slate200}` }}>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono px-1 rounded" style={{ backgroundColor: colors.white, border: `1px solid ${colors.slate200}` }}>
                                            {new Date(spike.timestamp * 1000).toISOString().substr(14, 5)}
                                        </span>
                                        <span className="text-xs font-bold">{spike.type}</span>
                                    </div>
                                    <span className="text-[10px] font-mono" style={{ color: colors.slate500 }}>VAL: {spike.value.toFixed(0)}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs italic" style={{ color: colors.slate500 }}>No significant emotional spikes detected.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* ACTION ITEMS */}
            <div className="mb-12 page-break-before">
                <h2 className="text-sm font-bold uppercase tracking-widest pb-2 mb-4" style={{ borderBottom: `1px solid ${colors.slate200}` }}>Coach Feedback</h2>
                <div className="space-y-4">
                    {data.metrics_data?.feedback_tips && data.metrics_data.feedback_tips.length > 0 ? (
                        data.metrics_data.feedback_tips.map((tip, i) => (
                            <div
                                key={i}
                                className="flex gap-4 items-start p-4 rounded"
                                style={{ border: `1px solid ${colors.slate200}`, backgroundColor: colors.slate50 }}
                            >
                                <div
                                    className="w-2 h-2 mt-2 rounded-full"
                                    style={{
                                        backgroundColor: tip.type === 'positive' ? colors.green500 : tip.type === 'negative' ? colors.red500 : colors.slate400
                                    }}
                                />
                                <p className="text-sm leading-relaxed" style={{ color: colors.slate700 }}>{tip.text}</p>
                            </div>
                        ))
                    ) : (
                        <p className="italic text-sm" style={{ color: colors.slate400 }}>No specific feedback generated.</p>
                    )}
                </div>
            </div>

            {/* FOOTER */}
            <div
                className="pt-8 mt-12 flex justify-between items-center text-[10px] font-mono uppercase tracking-widest"
                style={{ borderTop: `1px solid ${colors.slate200}`, color: colors.slate400 }}
            >
                <span>© 2026 PitchPrime Analytics</span>
                <span>Internal Use Only // Restricted Access</span>
            </div>
        </div>
    );
};

export default PDFReport;
