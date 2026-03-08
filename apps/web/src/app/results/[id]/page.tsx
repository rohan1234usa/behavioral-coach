/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState } from 'react';
import { api, AnalysisData } from '@/services/api';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import PDFReport from '@/components/PDFReport';
import {
  ArrowLeft,
  FileText,
  Download,
  Share2,
  Clock,
  User,
  CheckCircle2,
  AlertOctagon,
  Minus
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

export default function ResultPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [exporting, setExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!data || exporting) return;

    setExporting(true);
    try {
      // Small delay to ensure Recharts/React have finished rendering
      await new Promise(resolve => setTimeout(resolve, 800));

      const element = document.getElementById('pdf-report-content');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 1.5, // Good balance of quality and size
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 800, // Match the component width
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.85); // Use JPEG for smaller file size
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Analysis_Report_${id}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    const interval = setInterval(async () => {
      try {
        const result = await api.getResults(id as string);
        if (result.status === 'completed' && result.data) {
          setData(result.data);
          setLoading(false);
          clearInterval(interval);
        } else if (result.status === 'failed') {
          setLoading(false);
          setData(null); // Will show "Report Generation Failed" UI
          clearInterval(interval);
        }
      } catch (e) {
        // console.error(e);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="w-12 h-12 border-4 border-border border-t-foreground rounded-full animate-spin"></div>
        <span className="font-sans font-bold uppercase tracking-widest text-xs text-muted-foreground">Compiling Report...</span>
      </div>
    </div>
  );

  if (!data) return <div className="p-8 text-destructive font-sans font-bold uppercase">Report Generation Failed</div>;

  const videoUrl = api.getVideoUrl(id as string);

  return (
    <div className="min-h-screen bg-background text-foreground font-body p-6 md:p-12">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <header className="mb-12 border-b-2 border-foreground pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <Link href="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4 transition-colors font-sans text-xs uppercase tracking-widest">
              <ArrowLeft className="w-3 h-3 mr-2" /> Return to History
            </Link>
            <h1 className="text-4xl md:text-5xl font-sans font-bold text-foreground mb-2">Analysis Report</h1>
            <div className="flex gap-6 text-sm text-muted-foreground font-mono">
              <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> REF: {id}</span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {data.created_at ? new Date(data.created_at).toLocaleDateString() : new Date().toLocaleDateString()}</span>
              <span className="flex items-center gap-2"><User className="w-4 h-4" /> {data.candidate_name?.toUpperCase() || "CANDIDATE"}</span>
            </div>
          </div>
          <div className="flex gap-4">
            <button className="stone-button-secondary inline-flex items-center gap-2 text-xs">
              <Share2 className="w-4 h-4" /> Share
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="stone-button inline-flex items-center gap-2 text-xs disabled:opacity-50"
            >
              <Download className={`w-4 h-4 ${exporting ? 'animate-bounce' : ''}`} />
              {exporting ? 'Generating...' : 'Export PDF'}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* LEFT COLUMN: THE EVIDENCE (Video) */}
          <div className="lg:col-span-5 space-y-8">
            <div className="stacked-card p-2">
              <div className="aspect-video bg-muted/20 relative overflow-hidden">
                <video id="session-video" controls className="w-full h-full object-cover" src={videoUrl}>
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="p-4 border-t border-border bg-secondary/20 max-h-64 overflow-y-auto">
                <h3 className="text-xs font-sans font-bold uppercase tracking-widest text-muted-foreground mb-4 sticky top-0 bg-secondary/90 py-1">Interactive Transcript</h3>
                {data.metrics_data?.transcript_segments && data.metrics_data.transcript_segments.length > 0 ? (
                  <div className="space-y-3">
                    {data.metrics_data.transcript_segments.map((seg: any, idx: number) => (
                      <div
                        key={idx}
                        className="group flex gap-3 cursor-pointer p-2 hover:bg-muted/50 rounded transition-colors"
                        onClick={() => {
                          const vid = document.getElementById('session-video') as HTMLVideoElement;
                          if (vid) {
                            vid.currentTime = seg.start;
                            vid.play();
                          }
                        }}
                      >
                        <span className="text-xs font-mono text-accent/80 mt-1 whitespace-nowrap opacity-70 group-hover:opacity-100">
                          {new Date(seg.start * 1000).toISOString().substr(14, 5)}
                        </span>
                        <p className="font-body text-sm leading-relaxed text-foreground/90">
                          {seg.text}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-mono text-sm leading-relaxed text-foreground/80 italic">
                    "{data.transcript ? data.transcript.substring(0, 150) + "..." : "No transcript available yet."}"
                  </p>
                )}
              </div>
            </div>

            <div className="stacked-card p-6">
              <h3 className="text-sm font-sans font-bold uppercase tracking-widest text-foreground mb-4 border-b border-border pb-2">AI Summary</h3>
              <p className="font-body text-base leading-relaxed text-foreground/80">
                {data.summary || "Summary not available for this session."}
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: THE DATA */}
          <div className="lg:col-span-7 space-y-8">

            {/* KEY METRICS GRID */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Confidence', value: data.confidence_score },
                { label: 'Clarity', value: data.clarity_score },
                { label: 'Resilience', value: data.resilience_score },
                { label: 'Engagement', value: data.engagement_score },
              ].map(({ label, value }) => {
                const pct = Math.round((value || 0) * 100);
                const status: 'optimal' | 'warning' | 'critical' =
                  pct >= 70 ? 'optimal' : pct >= 45 ? 'warning' : 'critical';
                return <ReportMetric key={label} label={label} value={value} status={status} />;
              })}
            </div>

            {/* TIMELINE ANALYSIS */}
            <div className="stacked-card p-6">
              <div className="flex justify-between items-center mb-6 border-b border-border pb-2">
                <h3 className="text-sm font-sans font-bold uppercase tracking-widest text-foreground">Emotional Amplitude</h3>
                <div className="flex gap-4 text-xs font-mono">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-foreground rounded-full"></div> Valence</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-border rounded-full"></div> Arousal</span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.metrics_data?.timeline || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis dataKey="timestamp" hide />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', fontFamily: 'var(--font-ibm)' }}
                      itemStyle={{ color: 'var(--foreground)' }}
                    />
                    <Line type="step" dataKey="valence" className="stroke-foreground" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="arousal" className="stroke-muted" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ACTION ITEMS */}
            <div className="space-y-4">
              <h3 className="text-sm font-sans font-bold uppercase tracking-widest text-foreground border-b border-border pb-2">Coach feedback</h3>

              {data.metrics_data?.feedback_tips && data.metrics_data.feedback_tips.length > 0 ? (
                data.metrics_data.feedback_tips.map((tip: any, index: number) => (
                  <FeedbackItem key={index} type={tip.type} text={tip.text} />
                ))
              ) : (
                <div className="text-sm text-muted-foreground italic">No specific feedback available for this session.</div>
              )}
            </div>

            {/* EMOTIONAL SPIKES */}
            {data.metrics_data?.emotional_spikes && data.metrics_data.emotional_spikes.length > 0 && (
              <div className="stacked-card p-6 mt-8">
                <h3 className="text-sm font-sans font-bold uppercase tracking-widest text-foreground border-b border-border pb-2 mb-4">Emotional Highlights</h3>
                <div className="space-y-3">
                  {data.metrics_data.emotional_spikes.map((spike: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-secondary/30 rounded border border-border/50 cursor-pointer hover:border-accent/50 transition-colors"
                      onClick={() => {
                        const vid = document.getElementById('session-video') as HTMLVideoElement;
                        if (vid) {
                          vid.currentTime = spike.timestamp;
                          vid.play();
                        }
                      }}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-muted-foreground bg-background px-2 py-1 rounded">
                          {new Date(spike.timestamp * 1000).toISOString().substr(14, 5)}
                        </span>
                        <span className="text-sm font-body font-medium text-foreground">{spike.type}</span>
                      </div>
                      <span className="text-xs font-mono text-accent">Value: {spike.value.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}


          </div>
        </div>

        {/* Hidden PDF Content: Rendered off-screen for capture */}
        <div style={{ position: 'fixed', left: '-2000px', top: '0', width: '800px', zIndex: -100 }}>
          <div id="pdf-report-content">
            {data && <PDFReport data={data} sessionId={id as string} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportMetric({ label, value, status }: { label: string, value: number, status: 'optimal' | 'warning' | 'critical' }) {
  const percentage = Math.round((value || 0) * 100);
  const colorClass = status === 'optimal' ? 'text-accent' : status === 'warning' ? 'text-orange-500' : 'text-destructive';

  return (
    <div className="stacked-card p-6 flex flex-col gap-2">
      <span className="text-xs font-sans font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-mono font-medium text-foreground tracking-tighter">{percentage}%</span>
        <span className={`text-xs font-bold uppercase ${colorClass}`}>{status}</span>
      </div>
    </div>
  );
}

function FeedbackItem({ type, text }: { type: 'positive' | 'negative' | 'neutral', text: string }) {
  const Icon = type === 'positive' ? CheckCircle2 : type === 'negative' ? AlertOctagon : Minus;
  const colorClass = type === 'positive' ? 'text-accent' : type === 'negative' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div className="flex gap-4 items-start p-4 bg-secondary/20 border border-border/50 rounded-sm">
      <Icon className={`w-5 h-5 flex-shrink-0 ${colorClass}`} />
      <p className="text-sm font-body text-foreground leading-relaxed">{text}</p>
    </div>
  );
}