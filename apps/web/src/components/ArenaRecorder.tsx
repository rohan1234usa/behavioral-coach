'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { Loader2, Square, Volume2, VolumeX, LogIn } from 'lucide-react';
import { api } from '@/services/api';
import { useSpeechSynthesis, useAutoSpeak } from '@/hooks/useSpeechSynthesis';

/**
 * SUB-COMPONENT: InternalRecorder
 * This component only renders once the library is loaded, 
 * satisfying the Rules of Hooks.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      interval = setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  /**
   * FORMAT: MM:SS
   */
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center py-12">

      {/* THE OBJECT: 1:1 MONITOR */}
      <div className="relative group">
        {/* BEZEL */}
        <div className="w-[80vw] max-w-[600px] aspect-square bg-muted/30 border-[3px] border-border shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] p-1 transition-all duration-500">

          {/* SCREEN */}
          <div className="w-full h-full bg-black relative overflow-hidden grayscale">
            <video ref={videoRef} autoPlay muted className="w-full h-full object-cover opacity-90" />

            {/* RECORDING INDICATOR (PHYSICAL DOT) */}
            {status === 'recording' && (
              <div className="absolute top-6 right-6 w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div>
            )}
          </div>

        </div>

        {/* STATUS LABEL BELOW SCREEN */}
        <div className="mt-6 flex justify-between items-center w-full px-2 max-w-[600px]">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-sans">Sequence</span>
            <span className="text-xl font-mono font-medium text-foreground">{formatTime(timer)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${status === 'idle' ? 'bg-accent' : 'bg-border'}`}></div>
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-sans">
              {status === 'idle' ? 'Standby' : status === 'recording' ? 'Capture' : 'Process'}
            </span>
          </div>
        </div>
      </div>

      {/* CONTROLS: PHYSICAL INTERFACE */}
      <div className="mt-16 flex items-center justify-center">
        {status === 'idle' ? (
          <button
            onClick={() => { startRecording(); setStatus('recording'); }}
            className="group relative flex flex-col items-center gap-4 focus:outline-none"
          >
            {/* LARGE CLICKY BUTTON */}
            <div className="w-20 h-20 rounded-full bg-surface border-2 border-border shadow-[0_5px_0_rgba(200,200,200,1)] hover:translate-y-[2px] hover:shadow-[0_3px_0_rgba(200,200,200,1)] active:translate-y-[5px] active:shadow-none transition-all flex items-center justify-center">
              <div className="w-8 h-8 bg-red-600 rounded-full group-hover:scale-110 transition-transform"></div>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors font-sans">REC</span>
          </button>
        ) : status === 'recording' ? (
          <button
            onClick={stopRecording}
            className="group relative flex flex-col items-center gap-4 focus:outline-none"
          >
            {/* LARGE STOP BUTTON */}
            <div className="w-20 h-20 rounded-full bg-surface border-2 border-border shadow-[0_5px_0_rgba(200,200,200,1)] hover:translate-y-[2px] hover:shadow-[0_3px_0_rgba(200,200,200,1)] active:translate-y-[5px] active:shadow-none transition-all flex items-center justify-center">
              <div className="w-8 h-8 bg-foreground rounded-sm"></div>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors font-sans">STOP</span>
          </button>
        ) : null}
      </div>

      {/* LOADER OVERLAY */}
      {status === 'uploading' && (
        <div className="fixed inset-0 bg-background/90 z-50 flex flex-col items-center justify-center">
          <div className="w-16 h-1 bg-border overflow-hidden">
            <div className="h-full bg-foreground animate-progress"></div>
          </div>
          <p className="mt-4 font-mono text-sm uppercase tracking-widest text-muted-foreground">Archiving...</p>
        </div>
      )}

    </div>
  );
}

/**
 * MAIN COMPONENT: ArenaRecorder
 */
export default function ArenaRecorder({ initialQuestion = "Describe a difficult colleague." }: { initialQuestion?: string }) {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [recorderHook, setRecorderHook] = useState<any>(null);

  // Speech synthesis integration
  const { speak, stop, isSpeaking, isSupported } = useSpeechSynthesis();
  const { data: session } = useSession();

  // Auto-speak the question when component mounts (if enabled in settings)
  useAutoSpeak(initialQuestion, true);

  useEffect(() => {
    const loadRecorder = async () => {
      const mod = await import('react-media-recorder-2');
      setRecorderHook(() => mod.useReactMediaRecorder);
    };
    loadRecorder();
  }, []);

  const handleUploadFlow = async (blobUrl: string, blob: Blob) => {
    if (!session) {
      const confirmSignIn = window.confirm("You must be signed in to save and analyze your performance.\n\nSign in now?");
      if (confirmSignIn) {
        signIn("google", { callbackUrl: "/arena" });
      }
      // Reload to reset the recorder state if they cancel, or just let them lose the video?
      // Ideally we'd save it locally or something, but for now blocking is the request.
      return;
    }

    try {
      const sessionData = await api.startSession(initialQuestion);
      await api.uploadVideo(sessionData.session_id, blob);
      await api.triggerAnalysis(sessionData.session_id);
      router.push(`/results/${sessionData.session_id}`);
    } catch (err) {
      console.error("❌ ERROR:", err);
      // alert("Analysis failed. Check backend logs.");
      window.location.reload();
    }
  };

  // Handle voice button click
  const handleVoiceClick = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak(initialQuestion);
    }
  };

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-background text-foreground">

      {/* HEADER: QUESTION WITH VOICE BUTTON */}
      <div className="w-full border-b border-border py-6 bg-surface sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-center gap-4">
          <h1 className="text-lg font-sans font-bold text-foreground tracking-tight text-center flex-1">
            Module 01: <span className="text-muted-foreground font-normal">{initialQuestion}</span>
          </h1>

          {/* Voice Control Button */}
          {isSupported && (
            <button
              onClick={handleVoiceClick}
              className={`flex-shrink-0 w-10 h-10 rounded-sm border-2 flex items-center justify-center transition-all ${isSpeaking
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border hover:border-primary hover:bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              title={isSpeaking ? "Stop reading" : "Read question aloud"}
            >
              {isSpeaking ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      </div>

      {recorderHook ? (
        <InternalRecorder useRecorder={recorderHook} onUpload={handleUploadFlow} />
      ) : (
        <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-foreground opacity-20" />
        </div>
      )}
    </div>
  );
}