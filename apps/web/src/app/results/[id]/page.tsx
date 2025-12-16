'use client';

import React, { useEffect, useState } from 'react';
import { api, AnalysisData } from '@/services/api';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, CheckCircle, Brain, Zap, Activity, ArrowLeft, PlayCircle } from 'lucide-react';

export default function ResultPage() {
  const { id } = useParams();
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);

  // Poll for results until they are ready
  useEffect(() => {
    if (!id) return;

    const interval = setInterval(async () => {
      try {
        const result = await api.getResults(id as string);
        if (result.status === 'completed' && result.data) {
          // Merge top-level data with nested metrics data for easier access
          setData(result.data.metrics_data ? { ...result.data, ...result.data.metrics_data } : result.data);
          setLoading(false);
          clearInterval(interval);
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 1000); // Poll every second

    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">AI Coach is analyzing your delivery...</h2>
        <p className="text-gray-500">Processing facial cues and vocal prosody.</p>
      </div>
    );
  }

  if (!data) return <div className="p-8 text-center text-red-500">Error loading results.</div>;

  // Get the Proxy URL for the video
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
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-black rounded-xl overflow-hidden shadow-lg sticky top-8">
              <div className="aspect-video relative bg-gray-900 flex items-center justify-center">
                <video
                  controls
                  className="w-full h-full object-contain"
                  src={videoUrl}
                  preload="metadata"
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

          {/* RIGHT COLUMN: Analytics */}
          <div className="lg:col-span-2 space-y-6">

            {/* 1. Score Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <ScoreCard title="Confidence" score={data.confidence_score} icon={<CheckCircle />} color="text-green-600" />
              <ScoreCard title="Clarity" score={data.clarity_score} icon={<Brain />} color="text-blue-600" />
              <ScoreCard title="Resilience" score={data.resilience_score} icon={<Activity />} color="text-purple-600" />
              <ScoreCard title="Engagement" score={data.engagement_score} icon={<Zap />} color="text-yellow-600" />
            </div>

            {/* 2. Emotion Graph */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-6 text-gray-800">Emotional Timeline</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.metrics_data?.timeline || []}>
                    <XAxis
                      dataKey="timestamp"
                      label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, fontSize: 12 }}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      label={{ value: 'Intensity', angle: -90, position: 'insideLeft', fontSize: 12 }}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line type="monotone" dataKey="valence" stroke="#2563eb" name="Positivity" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="arousal" stroke="#dc2626" name="Energy/Stress" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-600"></span> Positivity (Valence)
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-600"></span> Energy (Arousal)
                </div>
              </div>
            </div>

            {/* 3. Feedback */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Coach's Feedback</h3>
              <ul className="space-y-3">
                {data.metrics_data?.feedback_tips?.map((tip, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-700 bg-gray-50 p-3 rounded-lg">
                    <span className="text-blue-500 mt-1">•</span>
                    <span className="leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ title, score, icon, color }: any) {
  return (
    <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-full">
      <div className="flex justify-between items-start mb-2">
        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">{title}</p>
        <div className={`p-2 bg-gray-50 rounded-lg ${color}`}>
          {React.cloneElement(icon, { size: 18 })}
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-800">{Math.round(score)}</p>
    </div>
  );
}