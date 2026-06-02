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

USER nodejs

EXPOSE 4008

CMD ["sh", "-c", "pnpm prisma migrate deploy && node index.js"]