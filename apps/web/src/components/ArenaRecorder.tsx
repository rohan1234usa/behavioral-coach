'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useReactMediaRecorder } from 'react-media-recorder';
import { useRouter } from 'next/navigation';
import { Video, Square, Loader2 } from 'lucide-react';
import { api } from '@/services/api';

export default function ArenaRecorder() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'recording' | 'uploading'>('idle');
  const [timer, setTimer] = useState(0);

  // 1. Define the upload logic
  const handleUpload = async (blobUrl: string, blob: Blob) => {
    console.log("🎥 Recording stopped. Blob ready:", blob.size, "bytes");
    setStatus('uploading');

    try {
      console.log("🚀 Creating Session...");
      const session = await api.startSession("Tell me about a time you failed.");
      console.log("✅ Session Created ID:", session.session_id);

      console.log("⬆️ Uploading Video to Backend Proxy...");
      // FIX: We now pass session_id instead of the old upload_url
      // The backend will handle the transfer to MinIO safely inside Docker.
      await api.uploadVideo(session.session_id, blob);

      console.log("✅ Upload Proxy Complete");

      console.log("🧠 Triggering Analysis...");
      await api.triggerAnalysis(session.session_id);

      console.log("🎉 Done! Redirecting...");
      router.push(`/results/${session.session_id}`);

    } catch (err) {
      console.error("❌ ERROR in flow:", err);
      alert("Something went wrong. Check the Console (F12) for details.");
      setStatus('idle');
    }
  };

  // 2. Pass handleUpload to onStop
  const { startRecording, stopRecording, previewStream } =
    useReactMediaRecorder({
      video: true,
      audio: true,
      blobPropertyBag: { type: 'video/webm' },
      onStop: (blobUrl, blob) => handleUpload(blobUrl, blob)
    });

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && previewStream) {
      videoRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'recording') {
      interval = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        Q: Tell me about a time you failed.
      </h1>

      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl mb-8">
        {status !== 'recording' && status !== 'uploading' && !previewStream && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            Click 'Start Answer' to initialize camera
          </div>
        )}

        <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />

        {status === 'recording' && (
          <div className="absolute top-4 right-4 bg-red-600/90 text-white px-4 py-1 rounded-full font-mono animate-pulse">
            {new Date(timer * 1000).toISOString().substr(14, 5)}
          </div>
        )}

        {status === 'uploading' && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white">
            <Loader2 className="w-12 h-12 animate-spin mb-2" />
            <p>Uploading & Analyzing...</p>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-4">
        {status === 'idle' ? (
          <button
            onClick={() => { startRecording(); setStatus('recording'); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold transition-all"
          >
            <Video className="w-5 h-5" /> Start Answer
          </button>
        ) : status === 'recording' ? (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full font-semibold transition-all"
          >
            <Square className="w-5 h-5" /> Finish Answer
          </button>
        ) : null}
      </div>
    </div>
  );
}