'use client';

import React, { useEffect, useState, useRef } from 'react';
import { api, type AnalysisData } from '@/services/api';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import PDFReport from '@/components/PDFReport';
import InteractiveParticles from '@/components/InteractiveParticles';
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

type ResultResponse = {
  status: string;
  data: AnalysisData | null;
};

export default function ResultPage() {
  const { id } = useParams();
  const sessionId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryToken = searchParams.get('token');
  const sessionToken = queryToken || (typeof window !== 'undefined' ? sessionStorage.getItem(`session-token:${sessionId}`) : null);
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportError, setReportError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

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
        onclone: (clonedDoc) => {
          // Ensure all SVGs and charts inside the cloned document are visible
          const charts = clonedDoc.querySelectorAll('.recharts-wrapper');
          charts.forEach(c => (c as HTMLElement).style.opacity = '1');
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.85); // Use JPEG for smaller file size
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Analysis_Report_${sessionId}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!sessionId) return;
    if (queryToken) {
      sessionStorage.setItem(`session-token:${sessionId}`, queryToken);
      router.replace(`/results/${sessionId}`);
    }
  }, [queryToken, router, sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    if (!sessionToken) {
      setReportError('This report link is missing its session access token.');
      setLoading(false);
      return;
    }

    let pollCount = 0;
    const maxPolls = 150; // ~5 minutes at 2s intervals
    const interval = setInterval(async () => {
      pollCount++;
      if (pollCount > maxPolls) {
        setLoading(false);
        setData(null);
        setReportError('Timed out while waiting for analysis to complete.');
        clearInterval(interval);
        return;
      }
      try {
        const result = await api.getResults(sessionId, sessionToken) as ResultResponse;
        if (result.status === 'completed' && result.data) {
          setData(result.data);
          setLoading(false);
          setReportError(null);
          clearInterval(interval);
        } else if (result.status === 'failed') {
          setLoading(false);
          setData(null);
          setReportError('Analysis failed for this session.');
          clearInterval(interval);
        }
      } catch (error) {
        const status = typeof error === 'object' && error && 'response' in error
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;
        if (status === 401 || status === 403 || status === 404) {
          setLoading(false);
          setData(null);
          setReportError('You do not have access to this report, or it no longer exists.');
          clearInterval(interval);
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [sessionId, sessionToken]);

  if (loading) return (
    <InteractiveParticles 
      text="Compiling Analysis Report..." 
      subtext="Analyzing video cadence, tone, and emotions." 
    />
  );

  if (!data || !sessionToken || !sessionId) return <div className="p-8 text-destructive font-sans font-medium">{reportError || 'Report Generation Failed'}</div>;

  const videoUrl = api.getVideoUrl(sessionId, sessionToken);

  return (
    <div className="min-h-screen bg-background text-foreground font-body p-6 md:p-12">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <header className="mb-12 border-b border-border pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <Link href="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4 transition-colors font-sans text-sm font-medium">
              <ArrowLeft className="w-4 h-4 mr-2" /> Return to History
            </Link>
            <h1 className="text-4xl md:text-5xl font-sans font-bold text-foreground mb-2">Analysis Report</h1>
            <div className="flex gap-6 text-sm text-muted-foreground font-mono mt-4">
              <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> REF: {sessionId}</span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {data.created_at ? new Date(data.created_at).toLocaleDateString() : new Date().toLocaleDateString()}</span>
              <span className="flex items-center gap-2"><User className="w-4 h-4" /> {data.candidate_name || "Candidate"}</span>
            </div>
          </div>
          <div className="flex gap-4">
            <button className="stone-button-secondary inline-flex items-center gap-2 text-sm">
              <Share2 className="w-4 h-4" /> Share
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="stone-button inline-flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <Download className={`w-4 h-4 ${exporting ? 'animate-bounce' : ''}`} />
              {exporting ? 'Generating...' : 'Export PDF'}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* LEFT COLUMN: THE EVIDENCE (Video) */}
          <div className="lg:col-span-5 space-y-8">
            <div className="stacked-card p-3 shadow-sm bg-surface">
              <div className="aspect-video bg-black rounded-lg relative overflow-hidden group shadow-inner">
                <video ref={videoRef} controls className="w-full h-full object-contain" src={videoUrl}>
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="p-4 border-t border-border mt-3 max-h-64 overflow-y-auto">
                <h3 className="text-sm font-sans font-semibold text-foreground mb-4 sticky top-0 bg-surface/90 py-1 backdrop-blur-sm">Interactive Transcript</h3>
                {data.metrics_data?.transcript_segments && data.metrics_data.transcript_segments.length > 0 ? (
                  <div className="space-y-3">
                    {data.metrics_data.transcript_segments.map((seg, idx) => (
                      <div
                        key={idx}
                        className="group flex gap-3 cursor-pointer p-2 hover:bg-muted/50 rounded-lg transition-colors"
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.currentTime = seg.start;
                            videoRef.current.play().catch(e => console.error("Playback failed", e));
                          }
                        }}
                      >
                        <span className="text-xs font-mono text-muted-foreground mt-1 whitespace-nowrap opacity-70 group-hover:opacity-100">
                          {new Date(seg.start * 1000).toISOString().substring(14, 19)}
                        </span>
                        <p className="font-body text-sm leading-relaxed text-foreground/90">
                          {seg.text}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-body text-sm leading-relaxed text-muted-foreground italic">
                    &quot;{data.transcript ? data.transcript.substring(0, 150) + "..." : "No transcript available yet."}&quot;
                  </p>
                )}
              </div>
            </div>

            <div className="stacked-card p-8 shadow-sm bg-surface">
              <h3 className="text-sm font-sans font-semibold text-foreground mb-6 border-b border-border pb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" /> AI Executive Summary
              </h3>
              <p className="font-body text-base leading-relaxed text-foreground/90">
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
                let finalVal = typeof value === 'number' ? value : 0;
                if (finalVal > 1) finalVal = finalVal / 100; // recover legacy un-bounded mock DB values
                
                const pct = Math.max(0, Math.min(100, Math.round(finalVal * 100)));
                const status: 'optimal' | 'warning' | 'critical' =
                  pct >= 70 ? 'optimal' : pct >= 45 ? 'warning' : 'critical';
                return <ReportMetric key={label} label={label} value={value} status={status} />;
              })}
            </div>

            {/* TIMELINE ANALYSIS */}
            <div className="stacked-card p-6 shadow-sm bg-surface">
              <div className="flex justify-between items-center mb-6 border-b border-border pb-2">
                <h3 className="text-sm font-sans font-semibold text-foreground">Emotional Amplitude</h3>
                <div className="flex gap-4 text-xs font-medium">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-accent rounded-full"></div> Tone</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-muted-foreground rounded-full"></div> Energy</span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.metrics_data?.timeline || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis dataKey="timestamp" hide />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', fontFamily: 'var(--font-ibm)', borderRadius: '0.5rem' }}
                      itemStyle={{ color: 'var(--foreground)' }}
                    />
                    <Line type="step" dataKey="tone" className="stroke-accent" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="energy" className="stroke-muted-foreground" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ACTION ITEMS */}
            <div className="space-y-4">
              <h3 className="text-sm font-sans font-semibold text-foreground border-b border-border pb-2">Coach feedback</h3>

              {data.metrics_data?.feedback_tips && data.metrics_data.feedback_tips.length > 0 ? (
                data.metrics_data.feedback_tips.map((tip, index) => (
                  <FeedbackItem key={index} type={tip.type} text={tip.text} />
                ))
              ) : (
                <div className="text-sm text-muted-foreground italic">No specific feedback available for this session.</div>
              )}
            </div>

            {/* EMOTIONAL SPIKES */}
            {data.metrics_data?.emotional_spikes && data.metrics_data.emotional_spikes.length > 0 && (
              <div className="stacked-card p-8 shadow-sm bg-surface">
                <h3 className="text-sm font-sans font-semibold text-foreground mb-6 border-b border-border pb-3 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-orange-500" /> Emotional Highlights
                </h3>
                <div className="space-y-3">
                  {data.metrics_data.emotional_spikes.map((spike, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg border border-border cursor-pointer hover:border-accent/50 transition-colors"
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.currentTime = spike.timestamp;
                          videoRef.current.play().catch(e => console.error("Playback failed", e));
                        }
                      }}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-muted-foreground bg-background px-2 py-1 rounded">
                          {new Date(spike.timestamp * 1000).toISOString().substring(14, 19)}
                        </span>
                        <span className="text-sm font-body font-medium text-foreground">{spike.type}</span>
                      </div>
                      <span className="text-xs font-medium text-orange-500 bg-orange-500/10 px-2 py-1 rounded-full">Value: {spike.value.toFixed(2)}</span>
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
            {data && sessionId && <PDFReport data={data} sessionId={sessionId} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportMetric({ label, value, status }: { label: string, value: number, status: 'optimal' | 'warning' | 'critical' }) {
  const percentage = Math.round((value || 0) * 100);
  const colorClass = status === 'optimal' ? 'text-accent' : status === 'warning' ? 'text-orange-500' : 'text-destructive';
  const bgClass = status === 'optimal' ? 'bg-accent/10' : status === 'warning' ? 'bg-orange-500/10' : 'bg-destructive/10';

  return (
    <div className="stacked-card p-6 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all bg-surface">
      <span className="text-sm font-sans font-medium text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-3">
        <span className="text-4xl md:text-5xl font-mono font-semibold text-foreground tracking-tight">{percentage}%</span>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colorClass} ${bgClass}`}>{status}</span>
      </div>
    </div>
  );
}

function FeedbackItem({ type, text }: { type: 'positive' | 'negative' | 'neutral', text: string }) {
  const Icon = type === 'positive' ? CheckCircle2 : type === 'negative' ? AlertOctagon : Minus;
  const colorClass = type === 'positive' ? 'text-accent' : type === 'negative' ? 'text-destructive' : 'text-muted-foreground';
  const borderColor = type === 'positive' ? 'border-accent/30' : type === 'negative' ? 'border-destructive/30' : 'border-border';

  return (
    <div className={`flex gap-4 items-start p-5 bg-surface border rounded-lg shadow-sm ${borderColor}`}>
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${colorClass}`} />
      <p className="text-sm font-body text-foreground/90 leading-relaxed">{text}</p>
    </div>
  );
}