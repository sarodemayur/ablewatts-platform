# Frontend image (Vite build served by nginx). Build context is the repo root —
# the pnpm workspace lockfile lives there:
#   docker build -f frontend/Dockerfile .
FROM node:22-alpine AS build

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
RUN pnpm install --frozen-lockfile --filter ablewatts-frontend

COPY frontend ./frontend

# Vite inlines VITE_* at build time, so the API URL is a build arg, not a runtime env.
# .env files are excluded by .dockerignore — this is the only source for it.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN pnpm --filter ablewatts-frontend run build

FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
