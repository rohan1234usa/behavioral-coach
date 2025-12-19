'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Square, Loader2 } from 'lucide-react';
import { api } from '@/services/api';

/**
 * SUB-COMPONENT: InternalRecorder
 * This component only renders once the library is loaded, 
 * satisfying the Rules of Hooks.
 */
function InternalRecorder({ useRecorder, onUpload }: { useRecorder: any, onUpload: any }) {
  const [status, setStatus] = useState<'idle' | 'recording' | 'uploading'>('idle');
  const [timer, setTimer] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { startRecording, stopRecording, previewStream } = useRecorder({
    video: true,
    audio: true,
    blobPropertyBag: { type: 'video/webm' },
    onStop: (blobUrl: string, blob: Blob) => {
      setStatus('uploading');
      onUpload(blobUrl, blob);
    }
  });

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
    <div className="w-full flex flex-col items-center">
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl mb-8">
        <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />

        {status === 'recording' && (
          <div className="absolute top-4 right-4 bg-red-600/90 text-white px-4 py-1 rounded-full font-mono animate-pulse">
            {new Date(timer * 1000).toISOString().substr(14, 5)}
          </div>
        )}

        {status === 'uploading' && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white">
            <Loader2 className="w-12 h-12 animate-spin mb-2" />
            <p className="text-lg">Analyzing with Imentiv AI...</p>
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

/**
 * MAIN COMPONENT: ArenaRecorder
 * Handles dynamic library loading and session flow.
 */
export default function ArenaRecorder() {
  const router = useRouter();
  const [recorderHook, setRecorderHook] = useState<any>(null);

  useEffect(() => {
    const loadRecorder = async () => {
      // Ensure we use the package you installed
      const mod = await import('react-media-recorder-2');
      setRecorderHook(() => mod.useReactMediaRecorder);
    };
    loadRecorder();
  }, []);

  const handleUploadFlow = async (blobUrl: string, blob: Blob) => {
    try {
      const session = await api.startSession("Tell me about a time you failed.");
      await api.uploadVideo(session.session_id, blob);
      await api.triggerAnalysis(session.session_id);
      router.push(`/results/${session.session_id}`);
    } catch (err) {
      console.error("❌ ERROR:", err);
      alert("Analysis failed. Check backend logs.");
      window.location.reload(); // Reset state
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Q: Tell me about a time you failed.</h1>

      {recorderHook ? (
        <InternalRecorder useRecorder={recorderHook} onUpload={handleUploadFlow} />
      ) : (
        <div className="flex flex-col items-center justify-center p-20 text-gray-400">
          <Loader2 className="w-10 h-10 animate-spin mb-4" />
          <p>Initializing Media Engine...</p>
        </div>
      )}
    </div>
  );
}