// 多阶段构建（Postgres 生产形态）。git 仓库中的 schema 保持 sqlite 版，
// 容器构建时由 scripts/use-pg-schema.js 切换，不污染源码。
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund
COPY . .
RUN node scripts/use-pg-schema.js && npx prisma generate
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/x" NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app ./
EXPOSE 3000
CMD ["node", "scripts/boot.js"]
