# ===== 阶段 1: 构建 =====
FROM node:20-slim AS builder

WORKDIR /app

# 安装系统依赖（sharp 需要）
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma/

# 安装依赖
RUN npm install --legacy-peer-deps

# 生成 Prisma Client
RUN npx prisma generate

# 复制源码并构建
COPY . .
RUN npx nest build

# ===== 阶段 2: 生产 =====
FROM node:20-slim AS production

WORKDIR /app

# 安装生产依赖的系统库
RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# 复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

# 复制 tts_server.py（打电话功能需要）
COPY tts_server.py ./

# 创建 uploads 目录
RUN mkdir -p uploads

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/main"]
