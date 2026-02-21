FROM node:20-alpine

RUN apk add --no-cache wget

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
	adduser -S nodejs -u 1001

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY prisma ./prisma/
RUN pnpm prisma generate

COPY --chown=nodejs:nodejs . .

USER nodejs

EXPOSE 4008

CMD ["sh", "-c", "pnpm prisma migrate deploy && node index.js"]