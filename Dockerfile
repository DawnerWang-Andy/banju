# 多阶段构建（Postgres 生产形态）。git 仓库中的 schema 保持 sqlite 版，
# 容器构建时由 scripts/use-pg-schema.js 切换，不污染源码。
FROM node:20-alpine AS build
WORKDIR /app
# Alpine 默认没有 openssl CLI，Prisma 会探测失败并下载 openssl-1.1.x 引擎（跑不起来）；
# libc6-compat 提供 glibc 兼容层，部分原生模块需要。
RUN apk add --no-cache openssl libc6-compat
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund
COPY . .
RUN node scripts/use-pg-schema.js && npx prisma generate
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/x" NEXT_TELEMETRY_DISABLED=1
RUN npm run build \
 && mkdir -p .next/standalone/.next \
 && cp -r .next/static .next/standalone/.next/static \
 && (test -d public && cp -r public .next/standalone/public || true)

FROM node:20-alpine AS run
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app ./
EXPOSE 3000
CMD ["node", "scripts/boot.js"]
