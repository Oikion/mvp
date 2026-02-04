# Oikion Worker Base Image
# Base image for all K8s job workers with shared dependencies and utilities
FROM node:20-slim AS base

# Install essential dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript
RUN pnpm build

# Set environment
ENV NODE_ENV=production

# Health check (workers are short-lived, but useful during startup)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('healthy')" || exit 1

# Default command (overridden by specific workers)
CMD ["node", "dist/index.js"]
