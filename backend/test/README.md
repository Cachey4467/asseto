# API测试文档

本目录包含了按类别细分的API测试文件，用于测试后端API的各种功能。

## 测试文件结构

```
test/
├── test_base.py          # 基础功能测试（健康检查等）
├── test_assets.py        # 资产管理测试（CRUD操作）
├── test_transactions.py  # 交易记录测试
├── test_config.py        # 配置管理测试
├── test_validation.py    # 验证和安全测试
├── run_all_tests.py      # 主测试运行器
├── test_api.py           # 原始测试文件（已重构）
└── README.md             # 本文件
```

## 测试分类

### 1. 基础功能测试 (`test_base.py`)
- 健康检查接口
- 服务器连接性测试

### 2. 资产管理测试 (`test_assets.py`)
- 添加资产
- 获取资产列表
- 获取价格信息
- 更新资产
- 删除资产
- 资产验证逻辑

### 3. 交易记录测试 (`test_transactions.py`)
- 创建交易记录
- 创建多个交易记录
- 获取交易记录
- 删除交易记录
- 交易验证逻辑

### 4. 配置管理测试 (`test_config.py`)
- 设置第三方配置
- 配置验证逻辑
- 获取配置（如果存在）
- 更新配置（如果存在）

### 5. 验证和安全测试 (`test_validation.py`)
- 错误情况处理
- 无效端点测试
- 格式错误请求测试
- 边界值测试
- SQL注入防护测试
- XSS防护测试
- 速率限制测试

## 使用方法

### 运行所有测试

```bash
cd backend/test
python run_all_tests.py
```

### 运行特定类别的测试

```bash
# 运行基础功能测试
python run_all_tests.py base

# 运行资产管理测试
python run_all_tests.py assets

# 运行交易记录测试
python run_all_tests.py transactions

# 运行配置管理测试
python run_all_tests.py config

# 运行配置系统测试
python run_all_tests.py config_system

# 运行验证和安全测试
python run_all_tests.py validation
```

### 运行单个测试文件

```bash
# 运行基础功能测试
python test_base.py

# 运行资产管理测试
python test_assets.py

# 运行交易记录测试
python test_transactions.py

# 运行配置管理测试
python test_config.py

# 运行配置系统测试
python test_config_system.py

# 运行验证和安全测试
python test_validation.py
```

## 测试配置

### 服务器地址
所有测试文件中的服务器地址都配置为：
```python
BASE_URL = "http://localhost:5000"
```

### 测试用户ID
测试使用的用户ID：
```python
TEST_USER_ID = "test_user_001"
```

## 测试特性

### 自动清理
- 每个测试类都有 `tearDown` 方法
- 自动清理测试过程中创建的数据
- 确保测试之间不会相互影响

### 详细输出
- 每个测试都会输出详细的请求和响应信息
- 包含状态码、响应数据等
- 便于调试和问题排查

### 错误处理
- 测试包含各种错误情况的处理
- 验证API的错误响应是否正确
- 测试边界值和异常输入

### 安全性测试
- SQL注入防护测试
- XSS攻击防护测试
- 速率限制测试（如果实现）

## 注意事项

1. **服务器状态**：运行测试前请确保后端服务器正在运行
2. **数据库状态**：测试会创建和删除数据，请确保使用测试数据库
3. **网络连接**：测试需要网络连接到后端服务器
4. **权限设置**：确保测试用户有足够的权限执行测试操作

## 测试结果解读

### 成功指标
- 所有测试通过
- 成功率 100%
- 无失败或错误

### 失败处理
- 检查服务器是否运行
- 检查网络连接
- 查看详细的错误信息
- 检查API接口是否变更

## 扩展测试

如需添加新的测试，请：

1. 创建新的测试文件或扩展现有文件
2. 遵循现有的命名和结构规范
3. 在 `run_all_tests.py` 中注册新的测试类
4. 更新本README文档

## 故障排除

### 常见问题

1. **连接错误**
   ```
   ❌ 无法连接到服务器，请确保后端服务正在运行
   ```
   解决：启动后端服务器

2. **测试失败**
   ```
   ❌ 测试失败：AssertionError
   ```
   解决：检查API响应是否符合预期

3. **导入错误**
   ```
   ❌ ModuleNotFoundError
   ```
   解决：确保在正确的目录下运行测试

### 调试技巧

1. 查看详细的测试输出
2. 检查服务器日志
3. 使用Postman等工具手动测试API
4. 检查数据库中的数据状态 