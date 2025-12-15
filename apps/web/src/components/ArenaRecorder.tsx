'use client';

import React, { useState, useEffect } from 'react';
import { useReactMediaRecorder } from 'react-media-recorder';
import { api } from '@/services/api';
import { useRouter } from 'next/navigation';
import { Video, Mic, Square, Play, Loader2 } from 'lucide-react';

export default function ArenaRecorder() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'recording' | 'uploading'>('idle');
  const [timer, setTimer] = useState(0);
  
  const { startRecording, stopRecording, mediaBlobUrl, previewStream } =
    useReactMediaRecorder({ video: true, audio: true, blobPropertyBag: { type: 'video/webm' } });

  // Handle Video Preview
  const videoRef = React.useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current && previewStream) {
      videoRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  // Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'recording') {
      interval = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const handleStop = async () => {
    stopRecording();
    setStatus('uploading');

    // Slight delay to ensure Blob is ready (React Media Recorder quirk)
    setTimeout(async () => {
        // In a real app, we'd grab the blob directly from the onStop hook.
        // For this snippet, we fetch it from the URL generated.
        if (mediaBlobUrl) {
            const blob = await fetch(mediaBlobUrl).then(r => r.blob());
            await processSubmission(blob);
        }
    }, 1000); 
  };
  
  // Note: For a robust implementation, use the onStop callback of the hook
  // to get the blob immediately rather than fetching mediaBlobUrl. 
  // We use this pattern here for simplicity in copy-pasting.

  const processSubmission = async (blob: Blob) => {
    try {
      // 1. Get Slot
      const session = await api.startSession("Tell me about a time you failed.");
      
      // 2. Upload
      await api.uploadVideo(session.upload_url, blob);
      
      // 3. Trigger Analysis
      await api.triggerAnalysis(session.session_id);
      
      // 4. Redirect to Results
      router.push(`/results/${session.session_id}`);
    } catch (err) {
      console.error(err);
      alert("Upload failed. Check console.");
      setStatus('idle');
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        Q: Tell me about a time you failed.
      </h1>

      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
        {status !== 'recording' && status !== 'uploading' && !previewStream && (
             <div className="absolute inset-0 flex items-center justify-center text-gray-400">
               Click Start to initialize camera
             </div>
        )}
        
        <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
        
        {/* Timer Overlay */}
        {status === 'recording' && (
          <div className="absolute top-4 right-4 bg-red-600/90 text-white px-4 py-1 rounded-full font-mono animate-pulse">
            {new Date(timer * 1000).toISOString().substr(14, 5)}
          </div>
        )}
        
        {/* Uploading Overlay */}
        {status === 'uploading' && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white">
             <Loader2 className="w-12 h-12 animate-spin mb-2" />
             <p>Analyzing micro-expressions...</p>
          </div>
        )}
      </div>

      <div className="mt-8 flex gap-4">
        {status === 'idle' ? (
          <button
            onClick={() => { startRecording(); setStatus('recording'); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold transition-all"
          >
            <Video className="w-5 h-5" /> Start Answer
          </button>
        ) : status === 'recording' ? (
          <button
            onClick={handleStop}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full font-semibold transition-all"
          >
            <Square className="w-5 h-5" /> Finish Answer
          </button>
        ) : null}
      </div>
    </div>
  );
}
