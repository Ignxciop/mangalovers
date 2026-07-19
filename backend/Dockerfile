FROM node:20-alpine

RUN apk add --no-cache wget

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
	adduser -S nodejs -u 1001

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY prisma ./prisma/
RUN pnpm prisma generate

RUN mkdir -p /app/uploads/avatars && chown -R nodejs:nodejs /app/uploads

COPY --chown=nodejs:nodejs . .

COPY docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh

USER nodejs

EXPOSE 4008

HEALTHCHECK --interval=15s --timeout=10s --start-period=120s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:4008/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]