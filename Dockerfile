# Use Node.js 20 Alpine with latest security patches
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Install security updates and required packages
RUN apk update && apk upgrade && apk add --no-cache \
    libc6-compat \
    dumb-init \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files
COPY package*.json ./
# Use npm ci for more secure, reproducible builds
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
RUN apk update && apk upgrade && rm -rf /var/cache/apk/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry during build for security
ENV NEXT_TELEMETRY_DISABLED 1

# Build the application
RUN npm run build

# Production image, copy all files and run next
FROM base AS runner
# Install security updates
RUN apk update && apk upgrade && apk add --no-cache \
    dumb-init \
    && rm -rf /var/cache/apk/*

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user with specific UID/GID for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application with proper ownership
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Health check for Coolify with curl alternative (wget is more secure in Alpine)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]