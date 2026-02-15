FROM python:3.11-slim

WORKDIR /code

# Install system dependencies (needed for psycopg2)
RUN apt-get update && apt-get install -y libpq-dev gcc

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Install the Imentiv SDK from the mounted volume at container startup
# The SDK is mounted at /code/imentiv-python-sdk via docker-compose
CMD pip install -e /code/imentiv-python-sdk --quiet 2>/dev/null; uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
