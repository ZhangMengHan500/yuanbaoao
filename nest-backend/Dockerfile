# ===== 阶段 1: 构建 =====
FROM node:20-slim AS builder

WORKDIR /app

# 使用阿里云镜像加速 apt
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources

# 安装系统依赖（sharp 需要）+ 生产依赖（openssl）一次性装完
RUN apt-get update && apt-get install -y \
    python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma/

# 配置 sharp 使用国内镜像
ENV npm_config_sharp_binary_host=https://npmmirror.com/mirrors/sharp
ENV npm_config_sharp_libvips_binary_host=https://npmmirror.com/mirrors/sharp-libvips

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

# 复制构建产物（不需要再装 apt 包了）
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
