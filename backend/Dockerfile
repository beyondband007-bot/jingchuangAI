FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/src ./src
COPY frontend-app/public ./public

RUN mkdir -p /app/storage

EXPOSE 3006

CMD ["node", "src/server.js"]
