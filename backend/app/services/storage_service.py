from typing import BinaryIO

import boto3

from app.core.config import get_settings


settings = get_settings()


def get_s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION_NAME,
    )


def upload_file_to_s3(file_obj: BinaryIO, key: str, content_type: str) -> str:
    client = get_s3_client()
    bucket = settings.AWS_S3_BUCKET_NAME
    if not bucket:
        raise RuntimeError("AWS_S3_BUCKET_NAME is not configured")
    client.upload_fileobj(
        file_obj,
        bucket,
        key,
        ExtraArgs={"ContentType": content_type},
    )
    url = f"https://{bucket}.s3.{settings.AWS_REGION_NAME}.amazonaws.com/{key}"
    return url

