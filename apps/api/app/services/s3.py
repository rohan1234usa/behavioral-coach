import boto3
from botocore.exceptions import ClientError
from app.core.config import settings

class S3Service:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )

    def generate_presigned_upload_url(self, object_name: str, expiration=300):
        try:
            response = self.s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': settings.S3_BUCKET_NAME,
                    'Key': object_name,
                    'ContentType': 'video/webm'
                },
                ExpiresIn=expiration
            )
            return response
        except ClientError as e:
            print(f"Error generating S3 URL: {e}")
            return None

s3_service = S3Service()
