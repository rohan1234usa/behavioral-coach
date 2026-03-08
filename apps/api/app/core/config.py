from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Behavioural Interview Coach"
    DATABASE_URL: str = "postgresql://postgres:password@db:5432/coach_dev"
    
    # AWS Credentials
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str

    # Imentiv AI
    IMENTIV_API_KEY: str = ""

    # S3 Endpoint (Optional, for MinIO)
    S3_ENDPOINT_URL: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
