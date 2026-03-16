import axios from 'axios';

// Use relative path to leverage Next.js Rewrites (avoids CORS)
const API_BASE = '/api';

// Types matching the Backend Schema
export interface Session {
  id: number;
  display_id: number;
  question_text: string;
  status: string;
  created_at: string;
  video_s3_key: string;
  confidence_score?: number;
  engagement_score?: number;
  clarity_score?: number;
  resilience_score?: number;
  dominant_emotion?: string | null;
}

export interface SessionInitResponse {
  session_id: number;
  upload_url: string;
  video_key: string;
}

export interface FeedbackTip {
  type: 'positive' | 'negative' | 'neutral';
  text: string;
}

export interface AnalysisData {
  transcript: string;
  summary: string;
  confidence_score: number;
  clarity_score: number;
  resilience_score: number;
  engagement_score: number;
  dominant_emotion: string | null;
  candidate_name: string;
  created_at: string;
  metrics_data: {
    timeline: Array<{
      timestamp: number;
      tone?: number;
      energy?: number;
      valence?: number;  // Kept for backward compatibility
      arousal?: number;  // Kept for backward compatibility
    }>;
    dominant_emotion: string | null;
    raw_emotions: Record<string, number>;
    feedback_tips: FeedbackTip[];
    transcript_segments?: Array<{ start: number; end: number; text: string; emotion?: string; raw_emotions?: Record<string, number> }>;
    emotional_spikes?: Array<{ timestamp: number; type: string; value: number }>;
  };
}

export interface ConfidenceData {
  score: number;
  breakdown: {
    potential: number;
    momentum: number;
    recent_sessions: number;
  };
  message: string;
}

export interface CoachingPlanData {
  id: number;
  target_role: string;
  industry_benchmark_notes: string;
  core_weakness: string;
  action_plan: string;
  created_at: string;
}

export const api = {
  // 1. Get Presigned URL
  startSession: async (question: string, userEmail?: string | null, userName?: string | null): Promise<SessionInitResponse> => {
    const payload = {
      question,
      user_email: userEmail,
      user_name: userName
    };
    const res = await axios.post(`${API_BASE}/upload/presigned-url`, payload);
    return res.data;
  },

  // NEW: Upload directly to the Backend (Bypasses Vercel/Next.js body size limits)
  uploadVideo: async (sessionId: number | string, file: Blob) => {
    const formData = new FormData();
    formData.append('file', file);

    // In Production: We POST directly to Render to bypass Next.js Vercel 4.5MB Limits.
    // Locally (undefined env var): We POST to the Next.js API proxy (which has no size limit locally) to avoid CORS.
    const uploadBase = process.env.NEXT_PUBLIC_BACKEND_URL ? process.env.NEXT_PUBLIC_BACKEND_URL : '';
    await axios.post(`${uploadBase}/api/sessions/${sessionId}/upload`, formData);
  },

  // NEW: Fetch history
  getSessions: async () => {
    const res = await axios.get(`${API_BASE}/sessions`);
    return res.data;
  },

  // NEW: Helper to get the video URL
  getVideoUrl: (sessionId: string) => {
    return `${API_BASE}/sessions/${sessionId}/video`;
  },

  // 3. Trigger Mock Analysis
  triggerAnalysis: async (sessionId: number) => {
    await axios.post(`${API_BASE}/analysis/${sessionId}/trigger`);
  },

  // 4. Poll for Results
  getResults: async (sessionId: string) => {
    const res = await axios.get(`${API_BASE}/analysis/${sessionId}/result`);
    return res.data; // Returns { status: "processing" | "completed", data: ... }
  },

  // NEW: Generate Questions (Non-Streaming - kept for backwards compatibility if needed)
  generateQuestions: async (company: string, role: string, resumeFile?: File): Promise<string[]> => {
    const formData = new FormData();
    formData.append('company', company);
    formData.append('role', role);
    if (resumeFile) {
      formData.append('resume', resumeFile);
    }
    const res = await axios.post(`${API_BASE}/questions/generate`, formData);
    return res.data;
  },

  // NEW: Generate Questions (Streaming)
  generateQuestionsStream: async (company: string, role: string, resumeFile?: File): Promise<ReadableStream<Uint8Array> | null> => {
    const formData = new FormData();
    formData.append('company', company);
    formData.append('role', role);
    if (resumeFile) {
      formData.append('resume', resumeFile);
    }
    
    // We use native fetch here because Axios does not natively stream responses in the browser
    // without advanced adapter configurations.
    const res = await fetch(`${API_BASE}/questions/generate`, {
        method: 'POST',
        body: formData,
    });
    
    if (!res.ok) {
        throw new Error(`Failed to generate questions: ${res.statusText}`);
    }

    return res.body; 
  },

  // NEW: Get Confidence Score
  getConfidenceScore: async (): Promise<ConfidenceData> => {
    const res = await axios.get(`${API_BASE}/analysis/confidence`);
    return res.data;
  },

  // NEW: Get Active Coaching Plan
  getCoachingPlan: async (): Promise<{status: string, data: CoachingPlanData | null}> => {
    const res = await axios.get(`${API_BASE}/analysis/coaching`);
    return res.data;
  },

  // NEW: Generate New Coaching Plan
  generateCoachingPlan: async (targetRole?: string, company?: string): Promise<{status: string, plan_id: number}> => {
    const res = await axios.post(`${API_BASE}/analysis/coaching/generate`, {
        target_role: targetRole || "",
        company: company || ""
    });
    return res.data;
  }
};