from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Behavioural Interview Coach"
    DATABASE_URL: str = "postgresql://postgres:password@db:5432/coach_dev"
    FRONTEND_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,https://behavioral-interview-coach.vercel.app"
    
    # AWS Credentials
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str

    # Imentiv AI
    IMENTIV_API_KEY: str = ""

    # S3 Endpoint (Optional, for MinIO)
    S3_ENDPOINT_URL: str = ""
    MAX_VIDEO_UPLOAD_BYTES: int = 100 * 1024 * 1024
    MAX_RESUME_UPLOAD_BYTES: int = 5 * 1024 * 1024

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
