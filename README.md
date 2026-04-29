# Behavioral Interview Coach

Behavioral Interview Coach is a monorepo for practicing behavioral interviews with AI-assisted question generation, video capture, multimodal analysis, and session review.

The current product combines:

- `apps/web`: Next.js 16, React 19, NextAuth, Tailwind CSS 4
- `apps/api`: FastAPI, SQLAlchemy, Pydantic Settings
- Storage: S3-compatible object storage via `boto3` (AWS S3 or MinIO)
- AI services: Imentiv for interview analysis, Gemini for question generation and coaching plans

## Current Product Surface

The codebase currently implements:

- A public landing page plus `about` and `settings` routes
- A practice arena where users can:
  - type a question manually, or
  - generate behavioral questions from company, role, and an optional resume PDF
- Google sign-in through NextAuth for saved history and coaching features
- Session creation with per-session access tokens
- Video upload to backend storage, followed by a background analysis job
- A dashboard with:
  - session history
  - aggregate confidence / clarity / resilience / engagement metrics
  - a generated coaching plan based on recent completed sessions
- A results page with:
  - video replay
  - transcript snippets
  - emotional timeline
  - feedback tips
  - PDF export

## Repo Layout

```text
behavioral-interview-coach/
├── apps/
│   ├── api/
│   │   ├── app/                          # FastAPI app
│   │   └── imentiv-python-sdk/           # Vendored Imentiv SDK
│   └── web/                              # Next.js frontend
├── scripts/
├── docker-compose.yml
└── README.md
```

## How The App Works

The implemented request flow is:

1. The user signs in on the frontend if they want persistent history or coaching.
2. The arena creates a session through `POST /api/upload/presigned-url`.
3. The API creates a `sessions` row and returns a session access token.
4. The frontend uploads the recorded `video/webm` file through `POST /api/sessions/{id}/upload`.
5. The frontend triggers analysis through `POST /api/analysis/{id}/trigger`.
6. The API downloads the saved video from S3-compatible storage, sends it to Imentiv, derives metrics, and stores the result.
7. The frontend polls `GET /api/analysis/{id}/result` and renders the report once analysis completes.

## Backend API Summary

Important routes in `apps/api/app/api/endpoints`:

- `upload.py`
  - `POST /api/upload/presigned-url`
  - `POST /api/sessions/{session_id}/upload`
- `analysis.py`
  - `GET /api/analysis/confidence`
  - `POST /api/analysis/{session_id}/trigger`
  - `GET /api/analysis/{session_id}/result`
  - `GET /api/analysis/coaching`
  - `POST /api/analysis/coaching/generate`
- `sessions.py`
  - `GET /api/sessions`
  - `GET /api/sessions/{session_id}/video`
- `questions.py`
  - `POST /api/questions/generate`

## Local Development

### Prerequisites

- Docker Desktop
- Node.js 18+
- npm
- API keys for Imentiv and Gemini
- Google OAuth credentials for frontend sign-in

### 1. Configure API environment

Create a root `.env` file for the FastAPI app and Docker Compose.

For local Docker development with the included MinIO service:

```dotenv
DATABASE_URL=postgresql://postgres:password@db:5432/coach_dev
FRONTEND_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
AUTO_CREATE_DB=true

AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_REGION=us-east-1
S3_BUCKET_NAME=behavioral-coach-dev
S3_ENDPOINT_URL=http://minio:9000
MAX_VIDEO_UPLOAD_BYTES=104857600
MAX_RESUME_UPLOAD_BYTES=5242880

IMENTIV_API_KEY=your_imentiv_key
IMENTIV_USER_CONSENT_VERSION=2.0.0
GEMINI_API_KEY=your_gemini_key
```

Notes:

- If `DATABASE_URL` is missing and you run the API outside Docker, `apps/api/app/main.py` falls back to `sqlite:///./sql_app.db`.
- `OPENAI_API_KEY` is not currently used by the checked-in application code.

### 2. Configure frontend environment

Create `apps/web/.env.local`:

```dotenv
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000
NEXT_PUBLIC_STORAGE_URL=http://127.0.0.1:9000
AUTH_SECRET=replace-with-a-random-secret
AUTH_GOOGLE_ID=your_google_oauth_client_id
AUTH_GOOGLE_SECRET=your_google_oauth_client_secret
```

Optional frontend env vars:

- `NEXT_PUBLIC_GA_ID` for Google Analytics

### 3. Start backend services

```bash
docker compose up --build db api minio
```

Expected local endpoints:

- API root: `http://127.0.0.1:8000/`
- API health: `http://127.0.0.1:8000/health`
- Swagger docs: `http://127.0.0.1:8000/docs`
- MinIO API: `http://127.0.0.1:9000`
- MinIO console: `http://127.0.0.1:9001`

### 4. Start the frontend

```bash
cd apps/web
npm install
npm run dev
```

Frontend URL:

- `http://localhost:3000`

## Database Behavior

The app currently relies on startup-time schema creation and light repair logic:

- `Base.metadata.create_all(...)` runs when `AUTO_CREATE_DB=true`
- missing `sessions.access_token` and `sessions.error_message` columns are repaired at startup
- existing sessions without an access token are backfilled

Alembic migrations are not yet part of this repo.

## Testing And Verification

What exists today:

- API-side test modules in `apps/api/test_*.py`
- a helper script at `scripts/test_options.py`
- frontend linting via `npm run lint`

Current caveat:

- `pytest` is not pinned in `apps/api/requirements.txt`, so you may need to install it separately in your API environment before running the API tests.

Example commands:

```bash
# frontend lint
cd apps/web
npm run lint

# API tests if pytest is available in your environment
cd apps/api
pytest
```

## Known Caveats

- The frontend currently uploads videos through `POST /api/sessions/{id}/upload`; the presigned URL returned by `POST /api/upload/presigned-url` is created but not used by the browser flow.
- `docker-compose.yml` includes a Windows bind mount for `C:\Users\rohan\Downloads\imentiv-python-sdk`, even though the repo also contains a vendored SDK copy under `apps/api/imentiv-python-sdk`. If that external path does not exist on your machine, adjust the compose file before starting the API container.
- `apps/web/README.md` is still the default Next.js starter README and does not describe this project.

## Deployment Notes

The checked-in code is aimed more at MVP/local development than production hardening. Before production use, expect to revisit:

- database migrations
- secret management
- storage bucket provisioning
- background job durability
- authentication and authorization hardening
- upload strategy consistency

## License

MIT. See [LICENSE](LICENSE).
