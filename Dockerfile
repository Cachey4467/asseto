# 使用国内镜像源的Dockerfile - 优化版本
# 基础镜像使用国内华为云的Python镜像，替换 docker.io 以加速拉取
FROM swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/python:3.11-slim

# 设置工作目录
WORKDIR /app

# 配置apt使用国内源（阿里云）并安装系统依赖
# 注意：RUN 命令中，&& 连接的指令是一个原子操作，任何一步失败都会导致整个 RUN 失败。
#      因此，将 apt-get update 和 install 放在同一个 RUN 命令中是最佳实践。
RUN echo "deb https://mirrors.aliyun.com/debian/ bookworm main contrib non-free" > /etc/apt/sources.list && \
    echo "deb https://mirrors.aliyun.com/debian/ bookworm-updates main contrib non-free" >> /etc/apt/sources.list && \
    echo "deb https://mirrors.aliyun.com/debian-security bookworm-security main contrib non-free" >> /etc/apt/sources.list && \
    apt-get clean && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
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

# 配置pip使用国内源（阿里云源）
# 注意：全局配置 pip 源后，后续的 pip install 都会默认使用这个源，不需要再指定 --index-url 和 --trusted-host
RUN pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/ && \
    # 阿里云 PyPI 源是 HTTPS 的，通常不需要 trusted-host。如果遇到证书问题再考虑添加。
    # pip config set global.trusted-host mirrors.aliyun.com && \
    pip install --upgrade pip # 建议在这里升级pip到最新版本

# 复制前端文件
COPY frontend/ ./frontend/

# 配置npm使用国内源（淘宝源）
RUN npm config set registry https://registry.npmmirror.com

# 构建前端
WORKDIR /app/frontend
# npm ci 比 npm install 更适合 CI/CD 环境，因为它会检查 package-lock.json 文件确保依赖一致性
RUN npm ci && npm run build

# 回到应用根目录
WORKDIR /app

# 复制后端文件
COPY backend/ ./backend/

# 安装Python依赖
WORKDIR /app/backend
# 由于上面已经全局配置了 pip 源，这里不需要再指定 --index-url 或 --trusted-host 了
RUN pip install --no-cache-dir -r requirements.txt

# 回到应用根目录
WORKDIR /app

# 复制配置文件
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# 设置时区为Asia/Shanghai (+8)
ENV TZ=Asia/Shanghai
# 使用 -snf 软链接，确保正确设置时区且 /etc/timezone 文件内容正确
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 创建必要的目录
# 确保在安装完依赖后再创建这些运行时目录，防止清理操作影响
RUN mkdir -p /var/log /var/run /app/backend/instance /var/log/nginx

# 设置权限
# 注意：/var/log 目录通常不需要 chown 为 www-data，因为 nginx 日志会写入 /var/log/nginx
# nginx 日志文件的权限通常由 nginx 进程自身管理
RUN chown -R www-data:www-data /app/frontend/dist && \
    # 如果 /var/log/nginx 存在，确保 nginx 进程有权限写入
    chmod 755 /var/log/nginx # 确保 nginx 目录可写

# 清理构建缓存和临时文件
# 再次清理，确保最终镜像尽可能小
# 注意：/app/frontend/node_modules 在 npm ci 后可能就只剩下生产依赖了，但这里确保移除了开发依赖
# /root/.npm 和 /root/.cache 是用户缓存，清理是好的习惯
RUN rm -rf /app/frontend/node_modules /root/.npm /root/.cache && \
    find /usr/local/lib/python*/ -name '__pycache__' -exec rm -rf {} + && \
    find /usr/local/lib/python*/ -name '*.pyc' -exec rm -f {} + # 清理 Python 字节码文件

# 暴露端口
EXPOSE 80

# 启动supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]