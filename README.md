# Asseto - 资产管理系统

一个全栈的个人资产管理应用，支持股票、基金等多种资产类型的追踪和管理。

## 📋 功能特性

- 🏦 **多资产管理** - 支持股票、基金等多种资产类型
- 📊 **实时价格追踪** - 集成多个数据源获取实时市场价格
- 💱 **多币种支持** - 支持多种货币，自动汇率转换
- 📈 **资产分析** - 提供详细的资产分析和统计图表
- 🔄 **交易记录** - 完整的买卖交易历史记录
- 📱 **响应式设计** - 适配桌面端和移动端

## 🏗️ 技术架构

### 前端
- **React 18** - 现代化的前端框架
- **TypeScript** - 类型安全的开发体验
- **Vite** - 快速的构建工具
- **Tailwind CSS** - 实用优先的CSS框架
- **Radix UI** - 高质量的组件库
- **Recharts** - 数据可视化图表库

### 后端
- **Python Flask** - 轻量级的Web框架
- **TinyDB** - 轻量级的文档数据库
- **APScheduler** - 任务调度器
- **定时数据同步** - 自动获取市场价格和汇率数据

### 部署
- **Docker** - 容器化部署
- **Nginx** - 反向代理和静态文件服务
- **Supervisor** - 进程管理

## 🚀 快速开始

### 使用 Docker（推荐）

1. 克隆项目
```bash
git clone https://github.com/Cachey4467/asseto
cd Asseto
```

2. 启动服务
```bash
docker-compose up -d
```

3. 访问应用
- 应用地址：http://localhost:5432
- 健康检查：http://localhost:5432/health

### 本地开发

#### 后端设置
```bash
cd backend
pip install -r requirements.txt
.\start.bat
```

#### 前端设置
```bash
cd frontend
npm install
npm run dev
```

## 📁 项目结构

```
Asseto/
├── backend/                 # Python Flask 后端
│   ├── app/
│   │   ├── api/v1/         # API 路由
│   │   ├── core/           # 核心功能（数据库、配置）
│   │   ├── models/         # 数据模型
│   │   ├── schedule/       # 定时任务
│   │   ├── services/       # 业务服务
│   │   └── util/           # 工具函数
│   ├── test/               # 测试文件
│   └── instance/           # 数据库实例
├── frontend/               # React TypeScript 前端
│   ├── src/
│   │   ├── components/     # React 组件
│   │   ├── pages/          # 页面组件
│   │   ├── hooks/          # 自定义 Hooks
│   │   └── styles/         # 样式文件
│   └── public/             # 静态资源
├── docker-compose.yml      # Docker 编排配置
├── Dockerfile             # Docker 镜像构建
├── nginx.conf             # Nginx 配置
└── supervisord.conf       # 进程管理配置
```

## 🔧 配置

### 环境变量
在 `docker-compose.yml` 中可以配置以下环境变量：

### 数据持久化
- 数据库文件：`./data:/app/backend/instance`
- 日志文件：`./logs:/var/log`

## 📊 API 文档

主要 API 端点：

- `POST /api/v1/assets/add` - 添加新资产
- `GET /api/v1/assets` - 获取资产列表
- `POST /api/v1/transactions/add` - 添加交易记录
- `GET /api/v1/transactions` - 获取交易历史
- `GET /health` - 健康检查

## 🧪 测试

### 后端测试
```bash
cd backend
python -m pytest test/
```

### 前端测试
```bash
cd frontend
npm run lint
npm run build
```

## 🤝 贡献

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📝 许可证

该项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🔗 相关链接

- [项目文档](docs/)
- [API 文档](docs/api.md)

---

如果你觉得这个项目有用，请给个 ⭐️ 支持一下！