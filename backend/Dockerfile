FROM node:20.20.0-bookworm

WORKDIR /app

ENV NODE_ENV=production
ENV FFMPEG_PATH=/app/node_modules/@ffmpeg-installer/linux-x64/ffmpeg

COPY backend/package*.json ./
RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 10000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm ci --omit=dev \
  && npm install --no-save @ffmpeg-installer/linux-x64@4.1.0 \
  && test -x "$FFMPEG_PATH" \
  && "$FFMPEG_PATH" -version

COPY backend/src ./src
COPY frontend-app/public ./public

RUN mkdir -p /app/storage

EXPOSE 3006

CMD ["node", "src/server.js"]
