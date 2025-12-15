# Behavioural Interview Coach 🎯

> **Version 1.0.0**
>
> An AI-powered training platform that quantifies "Soft Skills" by analyzing facial micro-expressions, vocal prosody, and speech clarity during mock interviews.

  

## 📖 Executive Summary

The **Behavioural Interview Coach** addresses the "Soft Skill Gap" in technical hiring. While traditional tools focus on code correctness (LeetCode), this platform focuses on **delivery**.

Using advanced computer vision and audio analysis, the application records user responses to behavioral questions (e.g., *"Tell me about a time you failed"*) and provides objective, quantified feedback on **Confidence**, **Clarity**, **Resilience**, and **Engagement**.

-----

## ✨ Key Features

### 1\. The "Arena" Recorder

A distraction-free, virtual interview environment.

  * **Zero-Latency Preview:** Uses the native MediaStream API.
  * **Visual Pacing:** Integrated timer and visual cues.
  * **Direct-to-Cloud Uploads:** Secure, signed URL uploads directly to AWS S3, bypassing server bottlenecks.

### 2\. Multi-Modal AI Analysis

The core engine aggregates data from two distinct streams:

  * **Facial Analysis:** Tracks Valence, Arousal, and specific Action Units (AUs) to detect stress spikes or lack of engagement.
  * **Vocal Prosody:** Analyzes pitch jitter, volume consistency, and words-per-minute (WPM) to score vocal stability.

### 3\. The "Soft Skill" Dashboard

Raw data is synthesized into four actionable metrics (0-100 scale):

  * **🛡️ Confidence:** Stability of voice + facial certainty.
  * **🧠 Clarity:** WPM optimization + pause analysis.
  * **❤️ Resilience:** Recovery time from stress/anxiety markers.
  * **⚡ Engagement:** Variation in pitch and facial expressiveness.

### 4\. Session History & Replay

  * **Progress Tracking:** View historical trends of your scores over time.
  * **Video Replay:** Securely stream past attempts with synchronized data overlays.

-----

## 🏗 Technical Architecture

The project utilizes a **Monorepo** structure with a "Hollow Core" dev strategy that allows for interchangeable AI modules.

```text
behavioural-coach/
├── apps/
│   ├── web/                 # Frontend: Next.js 14 (App Router), Tailwind, Recharts
│   └── api/                 # Backend: FastAPI, SQLAlchemy, Pydantic
├── docker-compose.yml       # Orchestration (Postgres + API)
└── .env                     # Configuration Secrets
```

### Data Flow

1.  **Client:** Requests a secure "upload slot" from the API.
2.  **API:** Returns an AWS S3 Presigned URL.
3.  **Client:** Uploads video binary directly to S3.
4.  **Client:** Triggers the Analysis Pipeline via Webhook.
5.  **Worker:** Backend processes the video (via Imentiv/OpenAI), calculates metrics, and stores results in PostgreSQL.
6.  **Client:** Polls for completion and renders the Dashboard.

-----

## 🚀 Getting Started

### Prerequisites

  * **Docker Desktop** (Running)
  * **Node.js** (v18+) & **npm**
  * **AWS Account** (S3 Access)

### 1\. Environment Configuration

Create a `.env` file in the root directory:

```bash
# --- Infrastructure ---
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=coach_prod
DATABASE_URL=postgresql://postgres:password@db:5432/coach_prod

# --- AWS Storage ---
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-production-bucket

# --- AI Integrations (Optional for Dev) ---
IMENTIV_API_KEY=your_imentiv_key
OPENAI_API_KEY=your_openai_key
```

### 2\. Launch Backend (Docker)

Spins up the Database and API Gateway.

```bash
docker-compose up --build -d
```

  * **API Health:** `http://localhost:8000/`
  * **Swagger Docs:** `http://localhost:8000/docs`

### 3\. Launch Frontend (Local)

Runs the Next.js application.

```bash
cd apps/web
npm install
npm run dev
```

  * **Application:** `http://localhost:3000`

-----

## 🧪 Development Workflow

### Running Tests

The project includes unit tests for the scoring algorithms and integration tests for the S3 upload flow.

```bash
# Run Backend Tests
docker-compose exec api pytest

# Run Frontend Linter
cd apps/web && npm run lint
```

### Database Migrations

We use Alembic (via SQLAlchemy) for schema management.

```bash
docker-compose exec api alembic upgrade head
```

-----

## 🔮 Future Roadmap (v2.0)

  * **Auth0 Integration:** Secure user accounts and personalized history.
  * **Real-time Feedback:** WebSocket integration for live coaching during the recording.
  * **Comparison Mode:** Compare your video side-by-side with "Gold Standard" answers.
