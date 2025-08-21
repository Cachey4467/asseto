# 后端CORS配置指南 (API v1)

## 问题描述
前端应用向后端API发送请求时遇到CORS错误：
```
OPTIONS /api/v1/assets/info?userId=test_user_001 HTTP/1.1" 404
```

这表示浏览器发送的预检请求(OPTIONS)没有被正确处理。

## 更新的API配置

### 新的配置信息
- **端口**: 5000 (原来是3001)
- **API路径前缀**: `/api/v1/` (统一使用版本1前缀)
- **资产API示例**: `http://localhost:5000/api/v1/assets/info`
- **交易API示例**: `http://localhost:5000/api/v1/transactions`

## 解决方案

### 1. Python Flask 后端配置

如果您使用的是Flask，需要安装并配置flask-cors：

```bash
pip install flask-cors
```

```python
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)

# 配置CORS - 允许所有来源的请求
CORS(app, resources={
    r"/api/v1/*": {  # 统一使用v1路径前缀
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Accept"]
    }
})

# 或者更简单的配置（开发环境）
# CORS(app)

# === 资产API（版本1）===
@app.route('/api/v1/assets/info', methods=['GET'])
def get_assets():
    user_id = request.args.get('userId')
    # 你的业务逻辑
    return jsonify({
        "success": True,
        "data": []
    })

@app.route('/api/v1/assets/prices', methods=['GET'])
def get_asset_prices():
    user_id = request.args.get('userId')
    # 你的业务逻辑
    return jsonify({
        "success": True,
        "data": []
    })

@app.route('/api/v1/assets/add', methods=['POST'])
def add_asset():
    data = request.get_json()
    
    # 验证资产类型 - 现在支持group类型
    if data.get('type') not in ['asset', 'liability', 'group']:
        return jsonify({
            "success": False,
            "error": "资产类型必须是 asset、liability 或 group"
        }), 400
    
    # 你的业务逻辑
    return jsonify({
        "success": True,
        "data": {"id": "new_asset_id", **data}
    })

@app.route('/api/v1/assets/del', methods=['POST'])
def delete_asset():
    data = request.get_json()
    # 你的业务逻辑
    return jsonify({
        "success": True,
        "message": f"资产 {data.get('symbol')} 删除成功"
    })

@app.route('/api/v1/assets/update', methods=['PUT'])
def update_asset():
    data = request.get_json()
    # 你的业务逻辑
    return jsonify({
        "success": True,
        "message": f"资产 {data.get('symbol')} 更新成功"
    })

# === 交易记录API（版本1）===
@app.route('/api/v1/transactions', methods=['GET'])
def get_transactions():
    user_id = request.args.get('userId')
    account_id = request.args.get('accountId')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    limit = request.args.get('limit', 100)
    
    # 你的业务逻辑 - 根据参数筛选交易记录
    # 示例返回数据
    sample_data = [
        {
            "id": "transaction1",
            "userId": user_id,
            "accountId": account_id or "account1",
            "description": "买入苹果股票",
            "date": "2024-01-15T10:30:00",
            "direction": 0,  # 0=入账
            "quantity": "100",
            "price": "150.50",
            "currency": "USD"
        },
        {
            "id": "transaction2",
            "userId": user_id,
            "accountId": account_id or "account1",
            "description": "卖出谷歌股票",
            "date": "2024-01-14T14:20:00",
            "direction": 1,  # 1=出账
            "quantity": "50",
            "price": "2800.75",
            "currency": "USD"
        }
    ]
    
    return jsonify({
        "success": True,
        "data": sample_data
    })

@app.route('/api/v1/transactions', methods=['POST'])
def create_transaction():
    data = request.get_json()
    
    # 验证必要字段
    required_fields = ['userId', 'accountId', 'direction', 'quantity', 'price', 'currency']
    for field in required_fields:
        if field not in data:
            return jsonify({
                "success": False,
                "error": f"缺少必要字段: {field}"
            }), 400
    
    # 验证交易方向
    if data.get('direction') not in [0, 1]:
        return jsonify({
            "success": False,
            "error": "交易方向必须是 0（入账）或 1（出账）"
        }), 400
    
    # 你的业务逻辑 - 创建新的交易记录
    new_transaction = {
        "id": f"transaction_{datetime.now().timestamp()}",
        **data,
        "date": data.get('date', datetime.now().isoformat())
    }
    
    return jsonify({
        "success": True,
        "data": new_transaction
    })

@app.route('/api/v1/transactions/<transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    user_id = request.args.get('userId')
    
    if not user_id:
        return jsonify({
            "success": False,
            "error": "缺少用户ID参数"
        }), 400
    
    # 你的业务逻辑 - 删除交易记录
    return jsonify({
        "success": True,
        "message": f"交易记录 {transaction_id} 删除成功"
    })

# 健康检查端点
@app.route('/api/v1/health', methods=['GET'])
def health_check():
    return jsonify({
        "success": True,
        "data": {
            "status": "healthy",
            "version": "1.0",
            "timestamp": datetime.now().isoformat()
        }
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)  # 使用端口5000
```

### 2. Node.js Express 后端配置

如果您使用的是Express：

```bash
npm install cors
```

```javascript
const express = require('express');
const cors = require('cors');

const app = express();

// 配置CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));

app.use(express.json());

// 处理所有OPTIONS请求
app.options('*', cors());

// === 资产API (版本1) ===
app.get('/api/v1/assets/info', (req, res) => {
  const userId = req.query.userId;
  // 你的业务逻辑
  res.json({
    success: true,
    data: []
  });
});

app.get('/api/v1/assets/prices', (req, res) => {
  const userId = req.query.userId;
  // 你的业务逻辑
  res.json({
    success: true,
    data: []
  });
});

app.post('/api/v1/assets/add', (req, res) => {
  const data = req.body;
  
  // 验证资产类型 - 现在支持group类型
  if (!['asset', 'liability', 'group'].includes(data.type)) {
    return res.status(400).json({
      success: false,
      error: '资产类型必须是 asset、liability 或 group'
    });
  }
  
  // 你的业务逻辑
  res.json({
    success: true,
    data: { id: 'new_asset_id', ...data }
  });
});

app.post('/api/v1/assets/del', (req, res) => {
  const { symbol } = req.body;
  // 你的业务逻辑
  res.json({
    success: true,
    message: `资产 ${symbol} 删除成功`
  });
});

app.put('/api/v1/assets/update', (req, res) => {
  const { symbol } = req.body;
  // 你的业务逻辑
  res.json({
    success: true,
    message: `资产 ${symbol} 更新成功`
  });
});

// === 交易记录API (版本1) ===
app.get('/api/v1/transactions', (req, res) => {
  const { userId, accountId, start_date, end_date, limit = 100 } = req.query;
  
  // 你的业务逻辑 - 根据参数筛选交易记录
  const sampleData = [
    {
      id: 'transaction1',
      userId: userId,
      accountId: accountId || 'account1',
      description: '买入苹果股票',
      date: '2024-01-15T10:30:00',
      direction: 0,
      quantity: '100',
      price: '150.50',
      currency: 'USD'
    },
    {
      id: 'transaction2', 
      userId: userId,
      accountId: accountId || 'account1',
      description: '卖出谷歌股票',
      date: '2024-01-14T14:20:00',
      direction: 1,
      quantity: '50',
      price: '2800.75',
      currency: 'USD'
    }
  ];
  
  res.json({
    success: true,
    data: sampleData
  });
});

app.post('/api/v1/transactions', (req, res) => {
  const data = req.body;
  
  // 验证必要字段
  const requiredFields = ['userId', 'accountId', 'direction', 'quantity', 'price', 'currency'];
  for (const field of requiredFields) {
    if (!(field in data)) {
      return res.status(400).json({
        success: false,
        error: `缺少必要字段: ${field}`
      });
    }
  }
  
  // 验证交易方向
  if (![0, 1].includes(data.direction)) {
    return res.status(400).json({
      success: false,
      error: '交易方向必须是 0（入账）或 1（出账）'
    });
  }
  
  // 你的业务逻辑
  const newTransaction = {
    id: `transaction_${Date.now()}`,
    ...data,
    date: data.date || new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: newTransaction
  });
});

app.delete('/api/v1/transactions/:transactionId', (req, res) => {
  const { transactionId } = req.params;
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: '缺少用户ID参数'
    });
  }
  
  // 你的业务逻辑
  res.json({
    success: true,
    message: `交易记录 ${transactionId} 删除成功`
  });
});

// 健康检查端点
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      version: '1.0',
      timestamp: new Date().toISOString()
    }
  });
});

app.listen(5000, () => {
  console.log('后端服务器运行在 http://localhost:5000');
});
```

## 数据结构说明

### 交易记录数据结构
```json
{
  "id": "transaction1",
  "userId": "user123",
  "accountId": "account1",
  "description": "买入苹果股票",
  "date": "2024-01-15T10:30:00",
  "direction": 0,
  "quantity": "100",
  "price": "150.50",
  "currency": "USD"
}
```

### 字段说明
- `id`: 交易记录唯一标识符
- `userId`: 用户ID
- `accountId`: 账户ID
- `description`: 交易描述
- `date`: 交易时间（ISO格式字符串）
- `direction`: 交易方向（0=入账，1=出账）
- `quantity`: 数量（字符串格式，支持高精度）
- `price`: 成交价格（字符串格式，支持高精度）
- `currency`: 货币单位

## 验证配置

1. 启动后端服务：`python app.py` 或 `node server.js`
2. 测试资产API：`http://localhost:5000/api/v1/assets/info?userId=test_user_001`
3. 测试交易API：`http://localhost:5000/api/v1/transactions?userId=test_user_001`
4. 应该看到JSON响应而不是404错误
5. 前端应用中应该能正常显示交易记录表格

## 常见问题

### Q: 交易记录接口返回404
A: 确认：
- 后端服务正在运行在端口5000
- 交易API路径使用 `/api/v1/transactions`（已更新）
- 所有交易相关端点都已实现

### Q: CORS错误仍然存在
A: 检查：
- CORS配置包含 `/api/v1/*` 路径模式
- 允许了所有必要的HTTP方法
- 响应头正确设置

### Q: 路径不统一导致的问题
A: 确认：
- 所有API都使用 `/api/v1/` 前缀
- 前后端路径配置一致
- 没有遗留的 `/api/` 路径

## 迁移检查清单

确认所有API路径都已更新：

- [ ] 资产API：`/api/v1/assets/*`
- [ ] 交易API：`/api/v1/transactions`（已更新）
- [ ] 健康检查：`/api/v1/health`
- [ ] CORS配置包含所有v1路径
- [ ] 前端API调用全部使用v1路径
- [ ] 后端所有端点实现v1路径

## 生产环境注意事项

在生产环境中：
1. 使用版本化的API设计，便于未来升级
2. 实现适当的API版本管理策略
3. 添加API版本弃用计划
4. 设置适当的缓存策略
5. 实现API使用统计和监控
6. 考虑API网关进行统一管理
7. 添加适当的API文档自动生成