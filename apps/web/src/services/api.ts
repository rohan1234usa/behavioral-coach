import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

// Types matching the Backend Schema
export interface Session {
  session_id: number;
  upload_url: string;
  video_key: string;
}

export interface AnalysisData {
  confidence_score: number;
  clarity_score: number;
  resilience_score: number;
  engagement_score: number;
  metrics_data: {
    timeline: Array<{
      timestamp: number;
      valence: number;
      arousal: number;
    }>;
    feedback_tips: string[];
  };
}

export const api = {
  // 1. Get Presigned URL
  startSession: async (question: string): Promise<Session> => {
    const res = await axios.post(`${API_BASE}/upload/presigned-url`, { question });
    return res.data;
  },

  // NEW: Upload to our Python Backend (Bypasses all CORS/Docker issues)
  uploadVideo: async (sessionId: number | string, file: Blob) => {
    const formData = new FormData();
    formData.append('file', file);

    // We post to the endpoint we just created in Step 1
    await axios.post(`${API_BASE}/sessions/${sessionId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
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
  }
};