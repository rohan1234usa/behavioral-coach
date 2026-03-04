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
      valence: number;
      arousal: number;
    }>;
    dominant_emotion: string | null;
    raw_emotions: Record<string, number>;
    feedback_tips: FeedbackTip[];
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

  // NEW: Upload to our Python Backend (Bypasses all CORS/Docker issues)
  uploadVideo: async (sessionId: number | string, file: Blob) => {
    const formData = new FormData();
    formData.append('file', file);

    // We post to the endpoint we just created in Step 1
    await axios.post(`${API_BASE}/sessions/${sessionId}/upload`, formData);
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

  // NEW: Generate Questions
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

  // NEW: Get Confidence Score
  getConfidenceScore: async (): Promise<ConfidenceData> => {
    const res = await axios.get(`${API_BASE}/analysis/confidence`);
    return res.data;
  }
};