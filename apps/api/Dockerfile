FROM python:3.11-slim

WORKDIR /code

# Install system dependencies (needed for psycopg2)
RUN apt-get update && apt-get install -y libpq-dev gcc

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code and the SDK we just moved
COPY . .

# Install the imentiv SDK included in the code folder
RUN pip install -e /code/imentiv-python-sdk/imentiv-python-sdk

# Start the FastAPI application
CMD uvicorn app.main:app --host 0.0.0.0 --port 8000
