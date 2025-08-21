# 资金管理系统后端

基于Flask框架的资金管理系统后端API服务，支持SQLite数据库存储。

## 功能特性

- 资产管理：新增、查询、删除资产和负债
- 价格查询：获取资产当前价格信息
- 第三方集成：支持长桥证券API集成
- 配置管理：第三方平台配置管理
- 数据库支持：SQLite数据库存储，支持账户和交易记录管理
- 数据持久化：支持数据库和JSON文件两种存储方式

## 项目结构

```
backend/
├── src/                    # 源代码目录
│   ├── __init__.py        # 包初始化文件
│   ├── app.py             # Flask应用主文件
│   ├── models.py          # 数据模型
│   ├── database.py        # 数据库管理模块
│   └── longbridge_client.py # 长桥证券客户端
├── run.py                 # 启动脚本
├── test_api.py            # API测试脚本
├── pyproject.toml         # 项目配置
├── finance.db             # SQLite数据库文件（自动创建）
└── README.md             # 项目说明
```

## 数据库设计

### Account 表（账户表）
- `id`: 账户唯一标识
- `userId`: 用户唯一标识
- `type`: 账户类型（如现金、银行等）
- `parentId`: 上级账户ID，用于账户层级管理
- `description`: 账户描述
- `amount`: 账户余额
- `price`: 当前资产价格
- `currency`: 货币类型
- `isActive`: 账户是否活跃

### Transaction 表（交易表）
- `id`: 交易唯一标识
- `userId`: 用户唯一标识
- `accountId`: 关联账户唯一标识
- `description`: 交易描述
- `date`: 交易日期时间
- `direction`: 资金流向（0=入账，1=出账）
- `amount`: 交易金额
- `price`: 价格
- `currency`: 货币类型

## 安装依赖

```bash
# 安装Python依赖
pip install -e .
```

## 运行服务

```bash
# 直接运行
python run.py

# 或者使用Flask命令
export FLASK_APP=src.app
export FLASK_ENV=development
flask run
```

## API接口

### 原有接口（兼容性）

#### 1. 新增资产项目
- **POST** `/api/assets/add`
- 新增一条资产或负债记录

#### 2. 获取所有资产和负债
- **GET** `/api/assets/info`
- 获取系统中所有的资产和负债项目列表

#### 3. 获取资产当前价格
- **GET** `/api/assets/prices`
- 获取所有资产当前的价格信息列表

#### 4. 删除资产项目
- **POST** `/api/assets/del`
- 删除指定的资产或负债项目

#### 5. 配置长桥证券接入口令
- **POST** `/api/config/set_third_party_key`
- 配置第三方证券接口的认证信息

### 新增数据库接口

#### 6. 账户管理
- **GET** `/api/accounts` - 获取账户列表
- **POST** `/api/accounts` - 创建新账户
- **PUT** `/api/accounts/<account_id>` - 更新账户信息
- **DELETE** `/api/accounts/<account_id>` - 删除账户

#### 7. 交易记录管理
- **GET** `/api/transactions` - 获取交易记录
- **POST** `/api/transactions` - 创建新交易记录
- **PUT** `/api/transactions/<transaction_id>` - 更新交易记录
- **DELETE** `/api/transactions/<transaction_id>` - 删除交易记录

#### 8. 健康检查
- **GET** `/api/health`
- 检查后端服务状态

## 数据存储

- 数据库：`finance.db`（SQLite）
- 资产数据：`assets.json`（备用方案）
- 第三方配置：`third_party_config.json`

## 环境变量

可以通过环境变量或`.env`文件配置：

```bash
# Flask配置
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
FLASK_DEBUG=True

# 长桥证券配置
LONGPORT_APP_KEY=your_app_key
LONGPORT_APP_SECRET=your_app_secret
LONGPORT_ACCESS_TOKEN=your_access_token
```

## 开发说明

1. 所有API返回格式统一为JSON
2. 成功响应包含`success: true`字段
3. 错误响应包含`success: false`和`error`字段
4. 支持CORS跨域请求
5. 数据持久化支持数据库和JSON文件两种方式
6. 数据库操作使用参数化查询，防止SQL注入

## 测试

```bash
# 运行API测试
python test_api.py
```

测试脚本会测试所有API接口，包括：
- 基础资产管理接口
- 数据库账户管理接口
- 数据库交易记录管理接口

## 注意事项

- 确保Python版本 >= 3.11
- 首次运行会自动创建数据库文件
- 长桥证券API需要有效的认证信息
- 数据库文件会自动创建在项目根目录
- 支持账户层级管理（通过parentId字段）
- 交易记录支持入账和出账两种方向

## 数据库迁移

如果需要从JSON文件迁移到数据库：

1. 确保后端服务已启动
2. 使用原有的资产API接口，数据会自动保存到数据库
3. 原有的JSON文件作为备用方案保留

## 生产环境建议

- 使用更强大的数据库（如PostgreSQL、MySQL）
- 添加数据库连接池
- 实现数据备份策略
- 添加用户认证和权限控制
- 使用环境变量管理敏感配置

