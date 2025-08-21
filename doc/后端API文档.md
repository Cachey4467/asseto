# 资金管理系统后端API文档

本文档列出了前端资金管理系统可调用的所有后端接口，接口路径 (`route`)、请求方式、请求参数及返回格式均已定义。

---

## 1. 新增一个资产项目

**接口说明**：新增一条资产或负债记录。

- **请求方法**：`POST`
- **请求路径**：`/api/v1/assets/add`
- **请求参数**（JSON）:

| 参数名       | 类型       | 说明                                | 取值示例             |
| ------------ | ---------- | ----------------------------------- | -------------------- |
| type         | string     | 资产类型                            | `"asset"` 或 `"liability"` |
| belong_id    | string     | 父级资产ID（可为空，根资产则为空） | `"parent_asset_id"`   |
| description  | string     | 资产描述                            | `"房产"`             |
| quantity     | number     | 资产数量                            | `100`                |
| remain_cost  | number     | 资产剩余成本                        | `1500000`            |
| currency     | string     | 货币单位                            | `"CNY"`              |
| symbol       | string     | 资产编号（唯一标识符）              | `"ASSET001"`         |
| userId       | string     | 用户ID                              | `"user123"`          |

- **请求示例**:
```json
{
  "type": "asset",
  "belong_id": "parent_asset_id",
  "description": "房产",
  "quantity": 100,
  "remain_cost": 1500000,
  "currency": "CNY",
  "symbol": "ASSET001",
  "userId": "user123"
}
```

- **返回示例**:
```json
{
  "success": true,
}
```

- **返回状态**:
| Status | Description |
| ------ | ----------- |
| 200    | 新增成功    |
| 400    | 新增失败    |

---

## 2. 获取指定用户的所有资产和负债

**接口说明**：获取指定用户的所有资产和负债项目列表。

- **请求方法**：`GET`
- **请求路径**：`/api/v1/assets/info`
- **请求参数**（Query）:

| 参数名       | 类型       | 说明                                | 取值示例             |
| ------------ | ---------- | ----------------------------------- | -------------------- |
| userId       | string     | 用户ID                              | `"user123"`          |

- **返回示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "asset1",
      "type": "asset",
      "belong_id": "",
      "description": "房产",
      "quantity": 100,
      "remain_cost": 1500000,
      "currency": "CNY",
      "symbol": "ASSET001",
      "userId": "user123"
    },
    {
      "id": "liability1",
      "type": "liability",
      "belong_id": "",
      "description": "贷款",
      "quantity": 1,
      "remain_cost": 500000,
      "currency": "CNY",
      "symbol": "LIAB001",
      "userId": "user123"
    }
  ]
}
```

---

## 3. 获取指定用户资产的当前价格

**接口说明**：获取指定用户所有资产当前的价格信息列表。

- **请求方法**：`GET`
- **请求路径**：`/api/v1/assets/prices`
- **请求参数**（Query）:

| 参数名       | 类型       | 说明                                | 取值示例             |
| ------------ | ---------- | ----------------------------------- | -------------------- |
| userId       | string     | 用户ID                              | `"user123"`          |

- **返回示例**:
```json
{
  "success": true,
  "data": [
    {
      "symbol": "ASSET001",
      "current_price": 15000.5,
      "currency": "CNY"
    },
    {
      "symbol": "ASSET002",
      "current_price": 1012.3,
      "currency": "USD"
    }
  ]
}
```

---

## 4. 删除资产项目

**接口说明**：删除指定的资产或负债项目。

- **请求方法**：`POST`
- **请求路径**：`/api/v1/assets/del`
- **请求参数**（JSON）:

| 参数名       | 类型       | 说明                                | 取值示例             |
| ------------ | ---------- | ----------------------------------- | -------------------- |
| symbol       | string     | 资产编号（唯一标识符）              | `"ASSET001"`         |
| userId       | string     | 用户ID                              | `"user123"`          |

- **请求示例**:
```json
{
  "symbol": "ASSET001",
  "userId": "user123"
}
```

- **返回示例**:
```json
{
  "success": true,
  "message": "资产 ASSET001 删除成功"
}
```

- **返回状态**:
| Status | Description |
| ------ | ----------- |
| 200    | 删除成功    |
| 400    | 删除失败    |

---

## 5. 更新资产项目

**接口说明**：更新指定的资产或负债项目信息。

- **请求方法**：`PUT`
- **请求路径**：`/api/v1/assets/update`
- **请求参数**（JSON）:

| 参数名       | 类型       | 说明                                | 取值示例             |
| ------------ | ---------- | ----------------------------------- | -------------------- |
| id           | string     | 资产编号（唯一标识符）              | `"ASSET001"`         |
| userId       | string     | 用户ID                              | `"user123"`          |
| type         | string     | 资产类型（可选）                    | `"asset"` 或 `"liability"` |
| belong_id    | string     | 父级资产ID（可选）                  | `"parent_asset_id"`   |
| description  | string     | 资产描述（可选）                    | `"房产"`             |

- **请求示例**:
```json
{
  "id": "3cb13426-87bc-4e13-97a7-704704b560de",
  "userId": "user123",
  "type": "property",
  "description": "更新后的房产描述",
  "belong_id": "f0949cc0-3e0a-42f1-aa9d-14fd1771e490"
}
```

- **返回示例**:
```json
{
  "success": true,
  "message": "资产 ASSET001 更新成功"
}
```

---

## 6. 配置第三方接口密钥

**接口说明**：配置第三方证券接口的认证信息。

- **请求方法**：`POST`
- **请求路径**：`/api/v1/config/set_third_party_key`
- **请求参数**（JSON）:

| 参数名       | 类型       | 说明                                | 取值示例             |
| ------------ | ---------- | ----------------------------------- | -------------------- |
| party_name   | string     | 第三方平台名称                      | `"longbridge"`       |
| token        | string     | 访问令牌                            | `"your_access_token"` |
| secret       | string     | 密钥                                | `"your_secret_key"`  |
| key          | string     | 应用密钥                            | `"your_app_key"`     |

- **请求示例**:
```json
{
  "party_name": "longbridge",
  "token": "your_access_token",
  "secret": "your_secret_key",
  "key": "your_app_key"
}
```

- **返回示例**:
```json
{
  "success": true,
  "message": "longbridge 配置保存成功"
}
```

---

## 7. 获取交易记录

**接口说明**：获取指定用户的交易记录，支持按账户ID和日期范围过滤，支持分页。

- **请求方法**：`GET`
- **请求路径**：`/api/v1/transactions`
- **请求参数**（Query）:

| 参数名       | 类型       | 说明                                | 取值示例             |
| ------------ | ---------- | ----------------------------------- | -------------------- |
| userId       | string     | 用户ID                              | `"user123"`          |
| accountId    | string     | 账户ID（可选）                      | `"account1"`         |
| start_date   | string     | 开始日期（可选，ISO格式）           | `"2024-01-01T00:00:00"` |
| end_date     | string     | 结束日期（可选，ISO格式）           | `"2024-12-31T23:59:59"` |
| page_index   | number     | 页码，从0开始（必选，默认0）         | `0`                  |
| page_size    | number     | 每页记录数（必选，默认20，最大1000）  | `20`                 |

- **返回示例**:
```json
{
  "success": true,
  "data": [
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
  ],
  "pagination": {
    "page_index": 0,
    "page_size": 20,
    "total_count": 150,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

---

## 8. 创建交易记录

**接口说明**：创建新的交易记录。

- **请求方法**：`POST`
- **请求路径**：`/api/v1/transactions`
- **请求参数**（JSON）:

| 参数名       | 类型       | 说明                                | 取值示例             |
| ------------ | ---------- | ----------------------------------- | -------------------- |
| userId       | string     | 用户ID                              | `"user123"`          |
| accountId    | string     | 账户ID                              | `"account1"`         |
| direction    | number     | 交易方向（0=入账，1=出账）          | `0` 或 `1`           |
| quantity     | number     | 数量                                | `100`                |
| price        | number     | 成交价格                             | `150.50`             |
| currency     | string     | 货币单位                            | `"USD"`              |
| description  | string     | 交易描述（可选）                    | `"买入苹果股票"`     |
| date         | string     | 交易日期（可选，ISO格式）           | `"2024-01-15T10:30:00"` |

- **请求示例**:
```json
{
  "userId": "user123",
  "accountId": "account1",
  "direction": 0,
  "quantity": 100,
  "price": 150.50,
  "currency": "USD",
  "description": "买入苹果股票",
  "date": "2024-01-15T10:30:00"
}
```

- **返回示例**:
```json
{
  "success": true,
  "data": {
    "id": "new_transaction_id",
    "userId": "user123",
    "accountId": "account1",
    "description": "买入苹果股票",
    "date": "2024-01-15T10:30:00",
    "direction": 0,
    "quantity": "100",
    "price": "150.50",
    "currency": "USD"
  }
}
```

---

## 9. 删除交易记录

**接口说明**：根据交易记录ID删除交易记录。

- **请求方法**：`DELETE`
- **请求路径**：`/api/v1/transactions/<transaction_id>`
- **请求参数**（Query）:

| 参数名       | 类型       | 说明                                | 取值示例             |
| ------------ | ---------- | ----------------------------------- | -------------------- |
| userId       | string     | 用户ID                              | `"user123"`          |

- **返回示例**:
```json
{
  "success": true,
  "message": "交易记录 transaction_id 删除成功"
}
```

---

## 10. 添加长桥证券API配置

**接口说明**：为用户添加长桥证券API配置信息。

- **请求方法**：`POST`
- **请求路径**：`/api/v1/config/longport/add`
- **请求参数**（JSON）:

| 参数名                | 类型       | 说明                                | 取值示例             |
| --------------------- | ---------- | ----------------------------------- | -------------------- |
| userId                | string     | 用户ID                              | `"user123"`          |
| belong_id             | string     | 父资产ID                          | `"xxx"`          |
| LONGPORT_APP_KEY      | string     | 长桥证券应用密钥                    | `"your_app_key"`     |
| LONGPORT_APP_SECRET   | string     | 长桥证券应用密钥                    | `"your_app_secret"`  |
| LONGPORT_ACCESS_TOKEN | string     | 长桥证券访问令牌                    | `"your_access_token"`|

- **请求示例**:
```json
{
  "userId": "user123",
  "belong_id": "989b4198-f6a7-424d-8368-5db899a5e7df",
  "LONGPORT_APP_KEY": "your_app_key",
  "LONGPORT_APP_SECRET": "your_app_secret",
  "LONGPORT_ACCESS_TOKEN": "your_access_token"
}
```

- **返回示例**:
```json
{
  "success": true,
  "data": {
    "message": "长桥证券API配置添加成功"
  }
}
```

---

## 12. 删除长桥证券API配置

**接口说明**：删除用户的长桥证券API配置信息。

- **请求方法**：`DELETE`
- **请求路径**：`/api/v1/config/longport/delete`
- **请求参数**（Query）:

| 参数名       | 类型       | 说明                                | 取值示例             |
| ------------ | ---------- | ----------------------------------- | -------------------- |
| userId       | string     | 用户ID                              | `"user123"`          |

- **返回示例**:
```json
{
  "success": true,
  "data": {
    "message": "长桥证券API配置删除成功",
    "userId": "user123",
    "timestamp": "2024-01-15T10:30:00"
  }
}
```

---

## 13. 获取用户配置列表

**接口说明**：获取用户的所有配置信息。

- **请求方法**：`GET`
- **请求路径**：`/api/v1/config/list`
- **请求参数**（Query）:

| 参数名       | 类型       | 说明                                | 取值示例             |
| ------------ | ---------- | ----------------------------------- | -------------------- |
| userId       | string     | 用户ID                              | `"user123"`          |
| type         | string     | 配置类型（可选，默认为third_party） | `"third_party"`      |

- **返回示例**:
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "type": "third_party",
    "configs": {
      "longport": {
        "LONGPORT_APP_KEY": "your_app_key",
        "LONGPORT_APP_SECRET": "your_app_secret",
        "LONGPORT_ACCESS_TOKEN": "your_access_token"
      }
    },
    "timestamp": "2024-01-15T10:30:00"
  }
}
```

---

## 14. 获取外汇汇率转换

**接口说明**：获取指定货币之间的汇率转换结果，支持实时汇率和历史汇率查询。

- **请求方法**：`GET`
- **请求路径**：`/api/v1/get_foreign_currency_rate`
- **请求参数**（Query）:

| 参数名         | 类型       | 必需 | 说明                                | 取值示例             |
| -------------- | ---------- | ---- | ----------------------------------- | -------------------- |
| from_currency  | string     | 是   | 源货币代码                          | `"USD"`, `"HKD"`, `"CNY"` |
| to_currency    | string     | 是   | 目标货币代码                        | `"USD"`, `"HKD"`, `"CNY"` |
| amount         | string     | 否   | 转换金额（默认为1）                 | `"100"`, `"99.99"`   |
| date           | string     | 否   | 指定日期（格式：YYYY-MM-DD）        | `"2024-01-15"`       |

- **支持的货币代码**：
  - `CNY`：人民币
  - `USD`：美元
  - `HKD`：港币

- **请求示例**:
```
GET /api/v1/get_foreign_currency_rate?from_currency=USD&to_currency=HKD&amount=100
```

- **返回示例**:
```json
{
  "success": true,
  "data": {
    "from_currency": "USD",
    "to_currency": "HKD",
    "original_amount": "100",
    "converted_amount": "780.50"
  }
}
```

- **错误返回示例**:
```json
{
  "success": false,
  "error": "缺少必需参数: from_currency 或 to_currency"
}
```

- **返回状态**:
| Status | Description |
| ------ | ----------- |
| 200    | 转换成功    |
| 400    | 参数错误（缺少必需参数、无效货币代码、日期格式错误、金额格式错误） |
| 500    | 货币转换失败（网络错误、汇率获取失败等） |

---

## 15. 获取价格面积图数据

**接口说明**：获取指定账户的价格面积图数据，用于分析资产价格随时间的变化趋势。

- **请求方法**：`GET`
- **请求路径**：`/api/v1/get_price_tracing`
- **请求参数**（Query）:

| 参数名       | 类型       | 必需 | 说明                                | 取值示例             |
| ------------ | ---------- | ---- | ----------------------------------- | -------------------- |
| accountId    | string     | 是   | 账户ID（目前仅支持0，表示重总资产）    | `"account1"`         |

- **请求示例**:
```
GET /api/v1/get_price_tracing?accountId=0
```

- **返回示例**:
```json
{
  "success": true,
  "data": {
    "accountId": "0",
    "price_tracing": [
      {
        "date": "2024-01-15T10:30:00",
        "price": "150.50"
      },
      {
        "date": "2024-01-16T10:30:00",
        "price": "152.30"
      },
      {
        "date": "2024-01-17T10:30:00",
        "price": "148.90"
      }
    ]
  }
}
```

- **错误返回示例**:
```json
{
  "success": false,
  "error": "缺少必需参数: accountId"
}
```

- **返回状态**:
| Status | Description |
| ------ | ----------- |
| 200    | 获取成功    |
| 400    | 参数错误（缺少必需参数） |

---

## 17. 健康检查

**接口说明**：检查后端服务运行状态。

- **请求方法**：`GET`
- **请求路径**：`/api/v1/health`
- **请求参数**：无

- **返回示例**:
```json
{
  "success": true,
  "message": "后端服务运行正常",
  "timestamp": "2024-01-15T10:30:00"
}
```

---

## 通用返回格式

所有接口都遵循以下返回格式：

### 成功响应
```json
{
  "success": true,
  "data": {...}  // 或 "message": "..."
}
```

### 错误响应
```json
{
  "success": false,
  "error": "错误描述信息"
}
```

### HTTP状态码
| Status | Description |
| ------ | ----------- |
| 200    | 请求成功    |
| 400    | 请求参数错误或业务逻辑错误 |
| 500    | 服务器内部错误 |

---

请根据以上接口设计对接后台服务。