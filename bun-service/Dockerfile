FROM oven/bun:1.1.29-alpine

WORKDIR /app

RUN apk add --no-cache curl

COPY package.json ./

RUN bun install --production

COPY . .

RUN chown -R bun:bun /app
USER bun

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["bun", "run", "index.ts"]
