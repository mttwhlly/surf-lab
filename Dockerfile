# Use Node.js 20 Alpine
FROM node:20-alpine AS base

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache dumb-init && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Remove problematic dependencies and install
RUN npm pkg delete dependencies.@types/canvas || true && \
    npm pkg delete devDependencies.@types/canvas || true && \
    npm pkg delete dependencies.canvas || true && \
    npm pkg delete devDependencies.canvas || true && \
    npm install && npm cache clean --force

# Copy source code and build
COPY . .
RUN npm run build

# Production stage - only runtime dependencies
FROM node:20-alpine AS runner

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache dumb-init && rm -rf /var/cache/apk/*

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=base /app/public ./public
COPY --from=base --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=base --chown=nextjs:nodejs /app/.next/static ./.next/static

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Health check for Coolify
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]