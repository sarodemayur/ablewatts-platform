# Backend image (Express + Prisma). Build context is the repo root — the pnpm
# workspace lockfile lives there:
#   docker build -f backend/Dockerfile .
FROM node:22-alpine

# Prisma's query engine needs OpenSSL on Alpine.
RUN apk add --no-cache openssl

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /app

# Manifests first so dependency installs stay cached across source changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# devDependencies are kept: `prisma` (migrate deploy) and `tsx` (seed) both run
# inside this container on boot.
RUN pnpm install --frozen-lockfile --filter ablewatts-backend

# Generate the Prisma client off the schema alone, before the rest of the source,
# so editing src/ doesn't invalidate the generate layer.
COPY backend/prisma ./backend/prisma
RUN pnpm --filter ablewatts-backend exec prisma generate

COPY backend ./backend
RUN pnpm --filter ablewatts-backend run build

WORKDIR /app/backend

# GREEN_DATA_DIR defaults to ./uploads/green-data, i.e. /app/backend/uploads/green-data,
# which staging mounts as a named volume.
RUN mkdir -p uploads/green-data

ENV NODE_ENV=production \
    PORT=4000
EXPOSE 4000

ENTRYPOINT ["/app/backend/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
