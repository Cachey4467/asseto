// 使用相对路径，通过nginx代理访问后端API
const API_BASE_URL = ''

// 数据类型定义 - 支持任意字符串类型
export interface Asset {
  id: string
  type: string  // 支持任意字符串类型，如 'asset', 'liability', 'group', 'stock', 'bond' 等
  belong_id: string
  description: string
  quantity: number
  remain_cost: number
  currency: string
  symbol: string
  userId: string
  price?: number  // 新增price字段，用于存储当前价格
}

// AssetPrice接口已废弃，现在价格信息直接包含在Asset.price字段中
// export interface AssetPrice {
//   id: string
//   current_price: number
//   currency: string
// }

// 新增交易记录接口定义
export interface Transaction {
  id: string
  userId: string
  accountId: string
  description: string
  date: string  // ISO格式日期字符串
  direction: 0 | 1  // 0=入账，1=出账
  quantity: string  // 数量（字符串格式）
  price: string     // 成交价格（字符串格式）
  currency: string
}

// 价格追踪数据接口定义
export interface PriceTracingData {
  date: string  // ISO格式日期字符串
  price: string // 价格（字符串格式）
}

export interface PriceTracingResponse {
  accountId: string
  price_tracing: PriceTracingData[]
}

// 长桥证券配置接口定义
export interface LongportConfig {
  userId: string
  belong_id: string
  LONGPORT_APP_KEY: string
  LONGPORT_APP_SECRET: string
  LONGPORT_ACCESS_TOKEN: string
}

// 批量更新资产接口定义
export interface BatchUpdateAssetRequest {
  updates: {
    id: string
    userId: string
    type?: string
    belong_id?: string
    description?: string
    quantity?: number
    cost?: number
    currency?: string
  }[]
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// API调用函数 - 避免CORS预检请求
class ApiService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      // 简化请求配置，避免触发CORS预检
      const config: RequestInit = {
        method: options.method || 'GET',
        ...options
      }

      // 只在POST/PUT请求时添加Content-Type，且使用简单请求兼容的类型
      if (options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE') {
        config.headers = {
          'Content-Type': 'application/json',
          ...options.headers
        }
      }

      const response = await fetch(`${endpoint}`, config)

      // 检查响应状态
      if (!response.ok) {
        // 尝试解析错误响应
        let errorMessage = `HTTP ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }

        return {
          success: false,
          error: errorMessage
        }
      }

      // 解析成功响应
      const data = await response.json()
      return data
    } catch (error) {
      // 网络错误处理
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          success: false,
          error: '无法连接到后端服务，请检查服务是否运行'
        }
      }
      
      // AbortError 处理
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: '请求已取消'
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : '请求失败'
      }
    }
  }

  // === 资产相关API ===

  // 获取用户所有资产 - 使用新的API路径
  async getAssets(userId: string): Promise<ApiResponse<Asset[]>> {
    const encodedUserId = encodeURIComponent(userId)
    return this.makeRequest<Asset[]>(`/api/v1/assets/info?userId=${encodedUserId}`)
  }

  // 获取资产价格 - 已废弃，现在从assets的price字段获取
  // async getAssetPrices(userId: string): Promise<ApiResponse<AssetPrice[]>> {
  //   const encodedUserId = encodeURIComponent(userId)
  //   return this.makeRequest<AssetPrice[]>(`/api/v1/assets/prices?userId=${encodedUserId}`)
  // }

  // 添加新资产 - 使用新的API路径
  async addAsset(asset: Omit<Asset, 'id'>): Promise<ApiResponse<Asset>> {
    return this.makeRequest<Asset>('/api/v1/assets/add', {
      method: 'POST',
      body: JSON.stringify(asset)
    })
  }

  // 添加资产组 - 使用新的group类型
  async addAssetGroup(group: {
    belong_id: string
    description: string
    userId: string
  }): Promise<ApiResponse<Asset>> {
    // 资产组现在直接使用type='group'来标识
    const groupData: Omit<Asset, 'id'> = {
      type: 'group',  // 直接使用group类型
      belong_id: group.belong_id,
      description: group.description,
      quantity: 0,    // 资产组可以保持数量为0
      remain_cost: 0, // 资产组可以保持成本为0
      currency: 'CNY',
      symbol: this.generateGroupSymbol(group.description),
      userId: group.userId
    }
    
    return this.makeRequest<Asset>('/api/v1/assets/add', {
      method: 'POST',
      body: JSON.stringify(groupData)
    })
  }

  // 生成资产组专用的symbol
  private generateGroupSymbol(name: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 5)
    const prefix = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substr(0, 3)
    return `GROUP_${prefix}_${timestamp}_${random}`
  }

  // 删除资产 - 使用新的API路径，现在使用id而不是symbol
  async deleteAsset(id: string, userId: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest<{ message: string }>('/api/v1/assets/del', {
      method: 'POST',
      body: JSON.stringify({ id, userId })
    })
  }

  // 更新资产 - 使用新的API路径，现在使用id而不是symbol
  async updateAsset(updates: {
    id: string
    userId: string
    type?: string  // 支持任意字符串类型
    belong_id?: string
    description?: string
    quantity?: number
    cost?: number
    currency?: string
  }): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest<{ message: string }>('/api/v1/assets/update', {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  }

  // 批量更新资产 - 新增批量操作接口
  async batchUpdateAssets(batchRequest: BatchUpdateAssetRequest): Promise<ApiResponse<{ 
    message: string
    successCount: number
    failedCount: number
    errors?: string[]
  }>> {
    return this.makeRequest<{ 
      message: string
      successCount: number
      failedCount: number
      errors?: string[]
    }>('/api/v1/assets/batch-update', {
      method: 'PUT',
      body: JSON.stringify(batchRequest)
    })
  }

  // 批量删除资产
  async batchDeleteAssets(assetIds: string[], userId: string): Promise<ApiResponse<{
    message: string
    successCount: number
    failedCount: number
    errors?: string[]
  }>> {
    return this.makeRequest<{
      message: string
      successCount: number
      failedCount: number
      errors?: string[]
    }>('/api/v1/assets/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ 
        assetIds,
        userId
      })
    })
  }

  // === 交易记录相关API - 更新为使用 /api/v1/ 路径 ===

  // 获取交易记录 - 使用统一的API v1路径，支持分页
  async getTransactions(params: {
    userId: string
    accountId?: string
    start_date?: string
    end_date?: string
    page_index: number  // 必选字段
    page_size: number   // 必选字段
  }): Promise<ApiResponse<{ 
    transactions: Transaction[]
    pagination: {
      page_index: number
      page_size: number
      total_count: number
      total_pages: number
      has_next: boolean
      has_prev: boolean
    }
  }>> {
    const queryParams = new URLSearchParams()
    queryParams.append('userId', params.userId)
    queryParams.append('page_index', params.page_index.toString())
    queryParams.append('page_size', params.page_size.toString())
    
    if (params.accountId) {
      queryParams.append('accountId', params.accountId)
    }
    if (params.start_date) {
      queryParams.append('start_date', params.start_date)
    }
    if (params.end_date) {
      queryParams.append('end_date', params.end_date)
    }

    try {
      const response = await fetch(`/api/v1/transactions?${queryParams.toString()}`)
      
      if (!response.ok) {
        // 尝试解析错误响应
        let errorMessage = `HTTP ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }

        return {
          success: false,
          error: errorMessage
        }
      }

      const responseData = await response.json()
      
      // 处理新的API响应格式
      if (responseData.success && responseData.data && responseData.pagination) {
        // 新格式：data是交易数组，pagination是分页信息
        return {
          success: true,
          data: {
            transactions: responseData.data as Transaction[],
            pagination: responseData.pagination
          }
        }
      } else if (responseData.success && Array.isArray(responseData.data)) {
        // 兼容旧格式：data直接是交易数组
        return {
          success: true,
          data: {
            transactions: responseData.data as Transaction[],
            pagination: {
              page_index: params.page_index,
              page_size: params.page_size,
              total_count: (responseData.data as Transaction[]).length,
              total_pages: 1,
              has_next: false,
              has_prev: false
            }
          }
        }
      } else if (responseData.success === false) {
        return {
          success: false,
          error: responseData.error || responseData.message || '获取交易记录失败'
        }
      }
      
      // 如果格式不匹配，返回错误
      return {
        success: false,
        error: '服务器响应格式不正确'
      }
    } catch (error) {
      // 网络错误处理
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          success: false,
          error: '无法连接到后端服务，请检查服务是否运行'
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : '请求失败'
      }
    }
  }

  // 创建交易记录 - 使用统一的API v1路径
  async createTransaction(transaction: {
    userId: string
    accountId: string
    direction: 0 | 1
    quantity: number
    price: number
    currency: string
    description?: string
    date?: string
  }): Promise<ApiResponse<Transaction>> {
    return this.makeRequest<Transaction>('/api/v1/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction)
    })
  }

  // 删除交易记录 - 使用统一的API v1路径
  async deleteTransaction(transactionId: string, userId: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest<{ message: string }>(`/api/v1/transactions/${transactionId}?userId=${userId}`, {
      method: 'DELETE'
    })
  }

  // 获取价格追踪数据
  async getPriceTracingData(accountId: string): Promise<ApiResponse<PriceTracingResponse>> {
    return this.makeRequest<PriceTracingResponse>(`/api/v1/get_price_tracing?accountId=${encodeURIComponent(accountId)}`)
  }

  // === 长桥证券相关API ===

  // 添加长桥证券配置
  async addLongportConfig(config: LongportConfig): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest<{ message: string }>('/api/v1/config/longport/add', {
      method: 'POST',
      body: JSON.stringify(config)
    })
  }

  // 获取长桥证券配置
  async getLongportConfig(userId: string, belongId: string): Promise<ApiResponse<LongportConfig>> {
    return this.makeRequest<LongportConfig>(`/api/v1/config/longport?userId=${encodeURIComponent(userId)}&belong_id=${encodeURIComponent(belongId)}`)
  }

  // 删除长桥证券配置
  async deleteLongportConfig(userId: string, belongId: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest<{ message: string }>('/api/v1/config/longport/delete', {
      method: 'POST',
      body: JSON.stringify({ userId, belong_id: belongId })
    })
  }

  // 同步长桥证券持仓
  async syncLongportHoldings(userId: string, belongId: string): Promise<ApiResponse<{ message: string; imported_count: number }>> {
    return this.makeRequest<{ message: string; imported_count: number }>('/api/v1/longport/sync', {
      method: 'POST',
      body: JSON.stringify({ userId, belong_id: belongId })
    })
  }
}

// 导出API服务实例
export const apiService = new ApiService()

// 模拟用户ID
export const CURRENT_USER_ID = 'test_user_001'

// API配置常量
export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  VERSION: 'v1',
  ENDPOINTS: {
    ASSETS_INFO: '/api/v1/assets/info',
    // ASSETS_PRICES: '/api/v1/assets/prices', // 已废弃
    ASSETS_ADD: '/api/v1/assets/add',
    ASSETS_DELETE: '/api/v1/assets/del',
    ASSETS_UPDATE: '/api/v1/assets/update',
    TRANSACTIONS: '/api/v1/transactions',
    LONGPORT_CONFIG: '/api/v1/config/longport',
    LONGPORT_SYNC: '/api/v1/longport/sync'
  }
}

// 导出用于测试的简单fetch函数
export const testApiConnection = async (): Promise<boolean> => {
  try {
    const apiUrl = `/api/v1/assets/info?userId=${CURRENT_USER_ID}`
    console.log('🔍 testApiConnection: 测试API连接:', apiUrl)
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    })
    
    console.log('🔍 testApiConnection: 收到响应', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    })
    
    // 只要服务器响应了（无论状态码是什么），都认为连接正常
    // 因为404、5000等错误状态码也说明后端服务是在运行的
    if (response.status >= 200 && response.status < 600) {
      try {
        // 尝试解析响应体，看看是否是有效的JSON
        const responseText = await response.text()
        console.log('🔍 testApiConnection: 响应内容:', responseText)
        
        const data = JSON.parse(responseText)
        console.log('🔍 testApiConnection: 解析后的数据:', data)
        
        // 任何有效的JSON响应都认为连接正常
        const isConnected = typeof data === 'object' && data !== null
        console.log('🔍 testApiConnection: 连接状态:', isConnected)
        return isConnected
      } catch (parseError) {
        console.warn('🔍 testApiConnection: JSON解析失败，但服务器有响应:', parseError)
        // 如果不是JSON格式，但服务器有响应，也算连接正常
        return true
      }
    }
    
    console.warn('🔍 testApiConnection: 响应状态码不在有效范围内')
    return false
  } catch (error) {
    console.error('🔍 testApiConnection: 网络错误', error)
    // 网络错误（无法连接、超时等）才认为连接失败
    return false
  }
}

// 导出生成唯一symbol的函数
export const generateUniqueSymbol = (description: string): string => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 5)
  const prefix = description.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substr(0, 3)
  return `ASSET_${prefix}_${timestamp}_${random}`
}

// 检查是否为资产组（现在基于type字段判断）
export const isAssetGroup = (asset: Asset): boolean => {
  return asset.type === 'group'
}