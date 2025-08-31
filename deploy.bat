@echo off
REM Asseto 部署脚本
REM 功能：本地构建Docker镜像，推送到阿里云镜像仓库，然后SSH到服务器更新部署

echo Building Docker image locally...
REM 构建Docker镜像，标签为asseto:latest
docker build -t asseto:latest .
if %errorlevel% neq 0 (
    echo Build failed!
    exit /b 1
)

echo Tagging image for registry...
REM 为镜像添加阿里云镜像仓库的标签
docker tag asseto:latest crpi-novp1hxow705ifwc.cn-guangzhou.personal.cr.aliyuncs.com/cckk4467/asseto:latest

echo Pushing to Aliyun registry...
REM 推送镜像到阿里云镜像仓库
docker push crpi-novp1hxow705ifwc.cn-guangzhou.personal.cr.aliyuncs.com/cckk4467/asseto:latest
if %errorlevel% neq 0 (
    echo Push failed!
    exit /b 1
)

echo Connecting to server and updating deployment...
REM SSH到服务器，切换到docker-compose目录，拉取最新镜像并重新部署
ssh -t fami@getinto.icu "cd ~/scripts/docker-composes/ && podman-compose pull asseto && podman-compose up -d asseto nginx -t 0"
if %errorlevel% neq 0 (
    echo Deployment failed!
    exit /b 1
)

echo Deployment completed successfully!