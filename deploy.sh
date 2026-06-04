#!/bin/bash
# ===== 元宝AI 部署脚本 =====
# 用法: bash deploy.sh

set -e

echo "🚀 开始部署元宝AI..."

# 1. 进入项目目录
cd /opt/yuanbao-ai || { echo "❌ 项目目录不存在"; exit 1; }

# 2. 拉取最新代码
echo "📥 拉取最新代码..."
git pull origin main

# 3. 拉取最新镜像
echo "🐳 拉取最新镜像..."
docker compose pull

# 4. 启动服务
echo "🔄 启动服务..."
docker compose up -d --remove-orphans

# 5. 等待数据库就绪
echo "⏳ 等待数据库就绪..."
sleep 10

# 6. 数据库迁移
echo "🗃️ 执行数据库迁移..."
docker compose exec -T app npx prisma db push --skip-generate

# 7. 清理旧镜像
echo "🧹 清理旧镜像..."
docker image prune -f

# 8. 检查服务状态
echo ""
echo "📊 服务状态:"
docker compose ps

echo ""
echo "✅ 部署完成！"
echo "🌐 访问地址: http://$(hostname -I | awk '{print $1}')"
