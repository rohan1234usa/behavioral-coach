'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  Loader2,
  CheckCircle,
  Brain,
  Zap,
  Activity,
  ArrowLeft,
  PlayCircle
} from 'lucide-react';

export default function ResultPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Helper: Formats raw seconds into a 0:SS string for the X-Axis
   */
  const formatXAxis = (tickItem: number) => {
    const seconds = Math.floor(tickItem);
    return `0:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!id) return;

    const interval = setInterval(async () => {
      try {
        const result = await api.getResults(id as string);

        // Only stop polling when backend confirms status is 'completed'
        if (result.status === 'completed' && result.data) {
          const baseData = result.data;

          /**
           * Logic: Our backend saves the 'timeline' array inside 'metrics_data'.
           * We merge them here so the chart can access 'data.timeline' directly.
           */
          const extendedData = baseData.metrics_data
            ? { ...baseData, ...baseData.metrics_data }
            : baseData;

          setData(extendedData);
          setLoading(false);
          clearInterval(interval);
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">AI Coach is analyzing your delivery...</h2>
        <p className="text-gray-500">Extracting emotional markers and facial cues.</p>
      </div>
    );
  }

  if (!data) return <div className="p-8 text-center text-red-500">Error loading results.</div>;

  const videoUrl = api.getVideoUrl(id as string);

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link href="/dashboard" className="inline-flex items-center text-gray-500 hover:text-gray-800 mb-2 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Analysis Results</h1>
            <p className="text-gray-600 text-sm">Session ID: {id}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT COLUMN: Video Player */}
          <div className="lg:col-span-1">
            <div className="bg-black rounded-xl overflow-hidden shadow-lg sticky top-8">
              <div className="aspect-video relative bg-gray-900 flex items-center justify-center">
                <video
                  controls
                  className="w-full h-full object-contain"
                  src={videoUrl}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="p-4 bg-white border-t border-gray-100">
                <div className="flex items-center gap-2 text-gray-800 font-semibold">
                  <PlayCircle className="w-5 h-5 text-blue-600" />
                  <span>Session Replay</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Recorded on {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Analytics Dashboard */}
          <div className="lg:col-span-2 space-y-6">

            {/* 1. Score Cards: Scaled from 0.0-1.0 to Percentage */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <ScoreCard title="Confidence" score={data.confidence_score} icon={<CheckCircle />} color="text-green-600" />
              <ScoreCard title="Clarity" score={data.clarity_score} icon={<Brain />} color="text-blue-600" />
              <ScoreCard title="Resilience" score={data.resilience_score} icon={<Activity />} color="text-purple-600" />
              <ScoreCard title="Engagement" score={data.engagement_score} icon={<Zap />} color="text-yellow-600" />
            </div>

            {/* 2. Emotional Timeline Graph  */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-6 text-gray-800">Emotional Timeline</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.timeline || []} margin={{ bottom: 20, left: -20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis
                      dataKey="timestamp"
                      type="number"
                      domain={[0, 'auto']}
                      tickFormatter={formatXAxis}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      label={{ value: 'Time (s)', position: 'insideBottom', offset: -10, fontSize: 12, fill: '#6b7280' }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      label={{ value: 'Intensity', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12, fill: '#6b7280' }}
                    />
                    <Tooltip
                      labelFormatter={(val) => `Time: ${formatXAxis(val)}`}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Line
                      type="monotone"
                      dataKey="valence"
                      stroke="#2563eb"
                      name="Positivity"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6 }}
                      isAnimationActive={true}
                    />
                    <Line
                      type="monotone"
                      dataKey="arousal"
                      stroke="#dc2626"
                      name="Energy"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6 }}
                      isAnimationActive={true}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. Coach Feedback Table/Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">AI Coach Feedback</h3>
              <div className="bg-blue-50/50 p-5 rounded-lg border border-blue-100">
                <p className="text-gray-800 leading-relaxed italic">
                  "{data.transcript || data.summary || "Analysis indicates a strong opening. To improve, try maintaining more consistent eye contact during the middle of your response."}"
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ScoreCard Component
 * Handles the visual representation of individual metrics.
 */
function ScoreCard({ title, score, icon, color }: any) {
  // Scaling real float values (e.g., 0.82) into UI percentages (82%)
  const displayScore = Math.round((score || 0) * 100);

  return (
    <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-full transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-2">
        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{title}</p>
        <div className={`p-1.5 bg-gray-50 rounded-md ${color}`}>
          {React.cloneElement(icon, { size: 16 })}
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <p className="text-3xl font-bold text-gray-900">{displayScore}</p>
        <span className="text-gray-400 text-sm font-medium">%</span>
      </div>
    </div>
  );
}