import axios from 'axios';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '').replace(/\/api$/, '');
const API_BASE = backendUrl ? `${backendUrl}/api` : '/api';

export interface AuthContext {
  email?: string | null;
  name?: string | null;
}

const authHeaders = (auth?: AuthContext) => {
  const headers: Record<string, string> = {};
  if (auth?.email) headers['X-User-Email'] = auth.email;
  if (auth?.name) headers['X-User-Name'] = auth.name;
  return headers;
};

const sessionHeaders = (sessionToken: string) => ({
  'X-Session-Token': sessionToken,
});

// Types matching the Backend Schema
export interface Session {
  id: number;
  display_id: number;
  question_text: string;
  status: string;
  created_at: string;
  session_token: string | null;
  confidence_score?: number;
  engagement_score?: number;
  clarity_score?: number;
  resilience_score?: number;
  dominant_emotion?: string | null;
}

export interface SessionInitResponse {
  session_id: number;
  upload_url: string;
  session_token: string;
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
  startSession: async (question: string, auth?: AuthContext): Promise<SessionInitResponse> => {
    const payload = {
      question,
    };
    const res = await axios.post(`${API_BASE}/upload/presigned-url`, payload, { headers: authHeaders(auth) });
    return res.data;
  },

  // NEW: Upload directly to the Backend (Bypasses Vercel/Next.js body size limits)
  uploadVideo: async (sessionId: number | string, file: Blob, sessionToken: string) => {
    const formData = new FormData();
    formData.append('file', file);

    await axios.post(`${API_BASE}/sessions/${sessionId}/upload`, formData, { headers: sessionHeaders(sessionToken) });
  },

  // NEW: Fetch history
  getSessions: async (auth?: AuthContext) => {
    const res = await axios.get(`${API_BASE}/sessions`, { headers: authHeaders(auth) });
    return res.data;
  },

  // NEW: Helper to get the video URL
  getVideoUrl: (sessionId: string, sessionToken: string) => {
    return `${API_BASE}/sessions/${sessionId}/video?session_token=${encodeURIComponent(sessionToken)}`;
  },

  // 3. Trigger Mock Analysis
  triggerAnalysis: async (sessionId: number, sessionToken: string) => {
    await axios.post(`${API_BASE}/analysis/${sessionId}/trigger`, null, { headers: sessionHeaders(sessionToken) });
  },

  // 4. Poll for Results
  getResults: async (sessionId: string, sessionToken: string) => {
    const res = await axios.get(`${API_BASE}/analysis/${sessionId}/result`, { headers: sessionHeaders(sessionToken) });
    return res.data; // Returns { status: "processing" | "completed", data: ... }
  },

  // NEW: Generate Questions (Non-Streaming - kept for backwards compatibility if needed)
  generateQuestions: async (company: string, role: string, resumeFile?: File, auth?: AuthContext): Promise<string[]> => {
    const formData = new FormData();
    formData.append('company', company);
    formData.append('role', role);
    if (resumeFile) {
      formData.append('resume', resumeFile);
    }
    const res = await axios.post(`${API_BASE}/questions/generate`, formData, { headers: authHeaders(auth) });
    return res.data;
  },

  // NEW: Generate Questions (Streaming)
  generateQuestionsStream: async (company: string, role: string, resumeFile?: File, auth?: AuthContext): Promise<ReadableStream<Uint8Array> | null> => {
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
        headers: authHeaders(auth),
        body: formData,
    });
    
    if (!res.ok) {
        throw new Error(`Failed to generate questions: ${res.statusText}`);
    }

    return res.body; 
  },

  // NEW: Get Confidence Score
  getConfidenceScore: async (auth?: AuthContext): Promise<ConfidenceData> => {
    const res = await axios.get(`${API_BASE}/analysis/confidence`, { headers: authHeaders(auth) });
    return res.data;
  },

  // NEW: Get Active Coaching Plan
  getCoachingPlan: async (auth?: AuthContext): Promise<{status: string, data: CoachingPlanData | null}> => {
    const res = await axios.get(`${API_BASE}/analysis/coaching`, { headers: authHeaders(auth) });
    return res.data;
  },

  // NEW: Generate New Coaching Plan
  generateCoachingPlan: async (targetRole?: string, company?: string, auth?: AuthContext): Promise<{status: string, plan_id: number}> => {
    const res = await axios.post(`${API_BASE}/analysis/coaching/generate`, {
        target_role: targetRole || "",
        company: company || ""
    }, { headers: authHeaders(auth) });
    return res.data;
  }
};