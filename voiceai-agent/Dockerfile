FROM python:3.11-slim
WORKDIR /app

# System deps for audio processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY agent.py .
COPY .env* ./

ENV PYTHONUNBUFFERED=1

CMD ["python", "agent.py", "start"]
