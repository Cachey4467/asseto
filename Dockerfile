# 使用国内镜像源的Dockerfile - 优化版本
FROM swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/python:3.11-slim

# 设置工作目录
WORKDIR /app

# 配置apt使用国内源（阿里云）并安装系统依赖
RUN echo "deb https://mirrors.aliyun.com/debian/ bookworm main contrib non-free" > /etc/apt/sources.list && \
    echo "deb https://mirrors.aliyun.com/debian/ bookworm-updates main contrib non-free" >> /etc/apt/sources.list && \
    echo "deb https://mirrors.aliyun.com/debian-security bookworm-security main contrib non-free" >> /etc/apt/sources.list && \
    apt-get clean && \
    apt-get update && \
    apt-get install -y \
    nginx \
    supervisor \
    curl \
    nodejs \
    npm \
    gcc \
    g++ \
    procps \
    ca-certificates \
    tzdata \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# 配置pip使用国内源（清华源）
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple && \
    pip config set global.trusted-host pypi.tuna.tsinghua.edu.cn

# 复制前端文件
COPY frontend/ ./frontend/

# 配置npm使用国内源（淘宝源）
RUN npm config set registry https://registry.npmmirror.com

# 构建前端
WORKDIR /app/frontend
RUN npm ci && npm run build

# 回到应用根目录
WORKDIR /app

# 复制后端文件
COPY backend/ ./backend/

# 安装Python依赖
WORKDIR /app/backend
RUN pip install --no-cache-dir -r requirements.txt --trusted-host pypi.tuna.tsinghua.edu.cn

# 回到应用根目录
WORKDIR /app

# 复制配置文件
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# 设置时区为Asia/Shanghai (+8)
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 创建必要的目录
RUN mkdir -p /var/log /var/run /app/backend/instance /var/log/nginx

# 设置权限
RUN chown -R www-data:www-data /app/frontend/dist && \
    chown -R root:root /var/log && \
    chmod 755 /var/log

# 清理构建缓存和临时文件
RUN rm -rf /app/frontend/node_modules /root/.npm /root/.cache

# 暴露端口
EXPOSE 80

# 启动supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
