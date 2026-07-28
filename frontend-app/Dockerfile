FROM node:22-alpine AS canvas-build

WORKDIR /canvas

COPY canvas-app/package*.json ./
RUN npm ci

COPY canvas-app/index.html ./
COPY canvas-app/public ./public
COPY canvas-app/src ./src
COPY canvas-app/scripts ./scripts
COPY src/styles /src/styles
COPY canvas-app/vite.config.js canvas-app/postcss.config.js canvas-app/tailwind.config.js ./

RUN npm run build

FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package*.json ./
RUN npm ci

COPY index.html ./
COPY public ./public
COPY src ./src
COPY scripts ./scripts
COPY vite.config.js ./
COPY viteMediaProxyPlugin.js ./

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=canvas-build /canvas/dist /usr/share/nginx/html/canvas-app

EXPOSE 80
