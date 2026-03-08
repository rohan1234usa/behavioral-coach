/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState, useRef } from 'react';
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
      pdf.save(`Analysis_Report_${id}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    let pollCount = 0;
    const maxPolls = 150; // ~5 minutes at 2s intervals
    const interval = setInterval(async () => {
      pollCount++;
      if (pollCount > maxPolls) {
        setLoading(false);
        setData(null);
        clearInterval(interval);
        return;
      }
      try {
        const result = await api.getResults(id as string);
        if (result.status === 'completed' && result.data) {
          setData(result.data);
          setLoading(false);
          clearInterval(interval);
        } else if (result.status === 'failed') {
          setLoading(false);
          setData(null);
          clearInterval(interval);
        }
      } catch (e) {
        // Network error — keep trying
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="w-12 h-12 border-4 border-border border-t-foreground rounded-full animate-spin"></div>
        <span className="font-sans font-medium text-sm text-muted-foreground">Compiling report...</span>
      </div>
    </div>
  );

  if (!data) return <div className="p-8 text-destructive font-sans font-medium">Report Generation Failed</div>;

  const videoUrl = api.getVideoUrl(id as string);

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
              <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> REF: {id}</span>
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
                    {data.metrics_data.transcript_segments.map((seg: any, idx: number) => (
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
                          {new Date(seg.start * 1000).toISOString().substr(14, 5)}
                        </span>
                        <p className="font-body text-sm leading-relaxed text-foreground/90">
                          {seg.text}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-body text-sm leading-relaxed text-muted-foreground italic">
                    "{data.transcript ? data.transcript.substring(0, 150) + "..." : "No transcript available yet."}"
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
                const pct = Math.round((value || 0) * 100);
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
                data.metrics_data.feedback_tips.map((tip: any, index: number) => (
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
                  {data.metrics_data.emotional_spikes.map((spike: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg border border-border cursor-pointer hover:border-accent/50 transition-colors"
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.currentTime = spike.timestamp;
                          videoRef.current.play().catch(e => console.error("Playback failed", e));
                        }
                      }}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-muted-foreground bg-background px-2 py-1 rounded">
                          {new Date(spike.timestamp * 1000).toISOString().substr(14, 5)}
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