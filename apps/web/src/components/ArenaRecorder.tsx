'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { Loader2, Volume2, VolumeX } from 'lucide-react';
import { api } from '@/services/api';
import { useSpeechSynthesis, useAutoSpeak } from '@/hooks/useSpeechSynthesis';

/**
 * SUB-COMPONENT: RecordingTimer
 * Isolates the intense 1-second state updates away from the Video element
 * to prevent hardware acceleration compositor flickering.
 */
function RecordingTimer({ status }: { status: 'idle' | 'recording' | 'uploading' }) {
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'recording') {
      const startedAt = Date.now();
      interval = setInterval(() => {
        setTimer(Math.floor((Date.now() - startedAt) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return <span className="text-xl font-mono font-medium text-foreground">{formatTime(status === 'recording' ? timer : 0)}</span>;
}

/**
 * SUB-COMPONENT: InternalRecorder
 * This component only renders once the library is loaded, 
 * satisfying the Rules of Hooks.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function InternalRecorder({ useRecorder, onUpload }: { useRecorder: any, onUpload: any }) {
  const [status, setStatus] = useState<'idle' | 'recording' | 'uploading'>('idle');
  const videoRef = useRef<HTMLVideoElement>(null);

  const { startRecording, stopRecording, previewStream } = useRecorder({
    video: true,
    audio: true,
    blobPropertyBag: { type: 'video/webm' },
    onStop: async (blobUrl: string, blob: Blob) => {
      setStatus('uploading');
      const keepProcessing = await onUpload(blobUrl, blob);
      if (!keepProcessing) {
        setStatus('idle');
      }
    }
  });

  useEffect(() => {
    // Only set the srcObject if we don't already have the same stream to prevent flicker on every tick
    if (videoRef.current && previewStream) {
      const currentStream = videoRef.current.srcObject as MediaStream;
      if (!currentStream || currentStream.id !== previewStream.id) {
        videoRef.current.srcObject = previewStream;
      }
    }
  }, [previewStream]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center py-12">

      {/* THE OBJECT: 1:1 MONITOR */}
      <div className="relative group flex flex-col items-center w-full">
        {/* BEZEL */}
        <div className="w-[85vw] max-w-[700px] aspect-[4/3] md:aspect-[16/9] bg-surface border border-border rounded-xl shadow-md p-1 backdrop-blur-xl transition-all duration-500 overflow-hidden relative">

          {/* SCREEN */}
          <div className="w-full h-full bg-black/95 rounded-lg relative overflow-hidden shadow-inner flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-1000 ${previewStream ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* RECORDING OVERLAYS */}
            {status === 'recording' && (
              <>
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-red-500/20">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                  <span className="font-sans text-xs text-red-50 font-medium tracking-wide">Recording</span>
                </div>
              </>
            )}

            {/* IDLE OVERLAYS */}
            {status === 'idle' && !previewStream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                <VolumeX className="w-8 h-8 opacity-30 mb-4" />
                <span className="font-sans text-sm font-medium">Initializing Camera...</span>
              </div>
            )}
          </div>

        </div>

        {/* STATUS LABEL BELOW SCREEN */}
        <div className="mt-4 flex justify-between items-center w-full px-2 max-w-[700px]">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground font-sans">Duration</span>
            <RecordingTimer status={status} />
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${status === 'idle' ? 'bg-accent' : 'bg-border'}`}></div>
            <span className="text-xs font-medium text-muted-foreground font-sans">
              {status === 'idle' ? 'Ready' : status === 'recording' ? 'Capturing' : 'Processing'}
            </span>
          </div>
        </div>
      </div>

      {/* CONTROLS: PHYSICAL INTERFACE */}
      <div className="mt-8 flex items-center justify-center">
        {status === 'idle' ? (
          <button
            onClick={() => { startRecording(); setStatus('recording'); }}
            className="group relative flex flex-col items-center gap-3 focus:outline-none"
          >
            {/* RECORD BUTTON */}
            <div className="w-20 h-20 rounded-full bg-surface border flex items-center justify-center shadow-sm hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] border-border hover:border-red-500/30">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center border border-border/50">
                <div className="w-6 h-6 bg-red-500 rounded-full group-hover:scale-110 shadow-[0_0_10px_rgba(239,68,68,0.3)] transition-all"></div>
              </div>
            </div>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors font-sans">Start Recording</span>
          </button>
        ) : status === 'recording' ? (
          <button
            onClick={stopRecording}
            className="group relative flex flex-col items-center gap-3 focus:outline-none"
          >
            {/* STOP BUTTON */}
            <div className="w-20 h-20 rounded-full bg-surface border flex items-center justify-center shadow-sm hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] border-border hover:border-foreground/30">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center border border-border/50">
                <div className="w-6 h-6 bg-foreground rounded-sm group-hover:scale-90 transition-all"></div>
              </div>
            </div>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors font-sans">Finish</span>
          </button>
        ) : null}
      </div>

      {/* LOADER OVERLAY */}
      {status === 'uploading' && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
          <div className="w-48 h-1.5 bg-border rounded-full overflow-hidden relative">
            <div className="absolute top-0 left-0 h-full bg-accent animate-progress rounded-full w-1/2"></div>
          </div>
          <p className="mt-4 font-sans text-sm font-medium text-muted-foreground animate-pulse">Analyzing performance...</p>
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
  const { data: session, status: authStatus } = useSession();

  // Auto-speak the question when component mounts (if enabled in settings)
  useAutoSpeak(initialQuestion, true);

  useEffect(() => {
    const loadRecorder = async () => {
      const mod = await import('react-media-recorder-2');
      setRecorderHook(() => mod.useReactMediaRecorder);
    };
    loadRecorder();
  }, []);

  const handleUploadFlow = async (blobUrl: string, blob: Blob): Promise<boolean> => {
    if (authStatus === 'loading') {
      alert("Still checking your sign-in status. Please try finishing again in a moment.");
      return false;
    }

    if (authStatus !== 'authenticated' || !session?.user) {
      const confirmSignIn = window.confirm("You must be signed in to save and analyze your performance.\n\nSign in now?");
      if (confirmSignIn) {
        signIn("google", { callbackUrl: "/arena" });
        return true;
      }
      return false;
    }

    try {
      const sessionData = await api.startSession(
        initialQuestion,
        session.user?.email,
        session.user?.name
      );
      await api.uploadVideo(sessionData.session_id, blob);
      await api.triggerAnalysis(sessionData.session_id);
      router.push(`/results/${sessionData.session_id}`);
      return true;
    } catch (err: unknown) {
      console.error("❌ ERROR in handleUploadFlow:", err);
      let message = "Analysis failed. Check console for details.";
      if (err instanceof Error) {
        console.error("Error details:", err.message, err.stack);
        message = `Analysis failed: ${err.message}`;
      }
      alert(message);
      return false;
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