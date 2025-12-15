'use client';

import React, { useEffect, useState } from 'react';
import { api, AnalysisData } from '@/services/api';
import { useParams } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, CheckCircle, Brain, Zap, Activity } from 'lucide-react';

export default function ResultPage() {
  const { id } = useParams();
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    const interval = setInterval(async () => {
      try {
        const result = await api.getResults(id as string);
        if (result.status === 'completed' && result.data) {
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

  if (!data) return <div>Error loading results.</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Analysis Results</h1>
          <p className="text-gray-600">Session ID: {id}</p>
        </header>

        {/* 1. Score Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <ScoreCard title="Confidence" score={data.confidence_score} icon={<CheckCircle />} color="text-green-600" />
          <ScoreCard title="Clarity" score={data.clarity_score} icon={<Brain />} color="text-blue-600" />
          <ScoreCard title="Resilience" score={data.resilience_score} icon={<Activity />} color="text-purple-600" />
          <ScoreCard title="Engagement" score={data.engagement_score} icon={<Zap />} color="text-yellow-600" />
        </div>

        {/* 2. Emotion Graph */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <h3 className="text-lg font-semibold mb-4">Emotional Timeline</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.metrics_data?.timeline || []}>
                <XAxis dataKey="timestamp" label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }} />
                <YAxis label={{ value: 'Intensity', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Line type="monotone" dataKey="valence" stroke="#2563eb" name="Positivity" strokeWidth={2} />
                <Line type="monotone" dataKey="arousal" stroke="#dc2626" name="Energy/Stress" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-gray-500 mt-2 text-center">
            Blue: Positivity (Valence) | Red: Energy/Stress (Arousal)
          </p>
        </div>

        {/* 3. Feedback */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Coach's Feedback</h3>
          <ul className="space-y-2">
            {data.metrics_data?.feedback_tips?.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-700">
                <span className="text-blue-500">•</span> {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ title, score, icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-sm font-medium uppercase">{title}</p>
        <p className="text-3xl font-bold mt-1">{Math.round(score)}</p>
      </div>
      <div className={`p-3 bg-gray-50 rounded-full ${color}`}>
        {icon}
      </div>
    </div>
  );
}
