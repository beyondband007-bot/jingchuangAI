FROM node:20.20.0-bookworm

WORKDIR /app

ENV NODE_ENV=production
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

COPY backend/package*.json ./
RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 10000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm ci --omit=dev \
  && test -x "$FFMPEG_PATH" \
  && test -x "$FFPROBE_PATH" \
  && "$FFMPEG_PATH" -version \
  && "$FFPROBE_PATH" -version

COPY backend/src ./src
COPY frontend-app/public ./public

RUN mkdir -p /app/storage

EXPOSE 3006

CMD ["sh", "-lc", "npm run db:init && npm start"]
