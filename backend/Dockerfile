# MelodyAI backend for Hugging Face Spaces (Docker SDK, free CPU)
FROM python:3.11-slim

# ffmpeg decodes/encodes audio
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face runs containers as user 1000
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    JOBS_DIR=/home/user/app/jobs
WORKDIR /home/user/app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Download the Demucs model at build time so the first song isn't slower
RUN python -c "from demucs.pretrained import get_model; get_model('htdemucs')"

COPY --chown=user . .

EXPOSE 7860
# --proxy-headers: HF serves us over HTTPS through a proxy; this makes the
# file URLs we return start with https:// instead of http://
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860", "--proxy-headers", "--forwarded-allow-ips", "*"]
