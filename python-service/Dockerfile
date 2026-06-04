FROM python:3.10-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖（不缓存，减小镜像）
RUN pip install --no-cache-dir -r requirements.txt

# 复制源码
COPY . .

# 创建输出目录
RUN mkdir -p outputs

# 暴露端口（使用 8001 避免与 ChromaDB 冲突）
EXPOSE 8001

# 启动命令
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
