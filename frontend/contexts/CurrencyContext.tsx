import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { toast } from "sonner"

export type CurrencyCode = 'CNY' | 'USD' | 'HKD'

// 统一数据管理接口
interface SharedDataType {
  portfolioData: any
  assets: any[]
  // prices: any[]  // 已废弃，现在价格信息包含在assets中
  summaryData: any
  distributionData: any[]
}

// 数据刷新Context接口
interface DataRefreshContextType {
  refreshAssetData: () => Promise<void>
  forceRefreshAssetData: () => Promise<void>  // 新增：强制立即刷新接口
  isRefreshing: boolean
  lastRefreshTime: Date | null
  isInitialLoad: boolean
  // 共享数据
  sharedData: SharedDataType
  updateSharedData: (key: keyof SharedDataType, data: any) => void
}

const DataRefreshContext = createContext<DataRefreshContextType | undefined>(undefined)

export const useDataRefresh = () => {
  const context = useContext(DataRefreshContext)
  if (context === undefined) {
    throw new Error('useDataRefresh must be used within a CurrencyProvider')
  }
  return context
}

export interface CurrencyInfo {
  code: CurrencyCode
  name: string
  symbol: string
  flag: string
}

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  CNY: { code: 'CNY', name: '人民币', symbol: '¥', flag: '🇨🇳' },
  USD: { code: 'USD', name: '美元', symbol: '$', flag: '🇺🇸' },
  HKD: { code: 'HKD', name: '港币', symbol: 'HK$', flag: '🇭🇰' }
}

interface CurrencyContextType {
  selectedCurrency: CurrencyCode
  setSelectedCurrency: (currency: CurrencyCode) => void
  getCurrencyInfo: (code: CurrencyCode) => CurrencyInfo
  formatCurrency: (amount: number, code?: CurrencyCode) => string
  exchangeRates: Record<string, number>
  convertCurrency: (amount: number, fromCurrency: CurrencyCode, toCurrency?: CurrencyCode) => Promise<number>
  refreshExchangeRates: () => Promise<void>
  isLoadingRates: boolean
  ratesVersion: number
}

// 将DataRefreshContextType合并到CurrencyContextType中
interface CombinedContextType extends CurrencyContextType, DataRefreshContextType {}

const CurrencyContext = createContext<CombinedContextType | undefined>(undefined)

export const useCurrency = () => {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}

interface CurrencyProviderProps {
  children: React.ReactNode
}

// 缓存有效期（毫秒）
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟
// 请求超时时间（毫秒）
const REQUEST_TIMEOUT = 8000 // 8秒

// 汇率缓存项接口
interface CacheItem {
  rate: number
  timestamp: number
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('CNY')
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({})
  const [isLoadingRates, setIsLoadingRates] = useState(false)
  const [ratesVersion, setRatesVersion] = useState(0)
  
  // 数据刷新状态
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  
  // 共享数据状态
  const [sharedData, setSharedData] = useState<SharedDataType>({
    portfolioData: null,
    assets: [],
    // prices: [],  // 已废弃
    summaryData: null,
    distributionData: [] // 保留字段以免破坏接口，但不再使用
  })
  
  // 缓存系统：存储汇率和时间戳
  const rateCache = useRef<Map<string, CacheItem>>(new Map())
  // 正在进行的请求去重
  const pendingRequests = useRef<Map<string, Promise<number>>>(new Map())
  // 正在进行的AbortController
  const activeControllers = useRef<Map<string, AbortController>>(new Map())
  // 数据获取请求去重
  const pendingDataRequests = useRef<Map<string, Promise<void>>>(new Map())
  // 初始化标志
  const initialized = useRef(false)

  const getCurrencyInfo = (code: CurrencyCode): CurrencyInfo => {
    return SUPPORTED_CURRENCIES[code]
  }

  const formatCurrency = useCallback((amount: number, code?: CurrencyCode): string => {
    const currency = code || selectedCurrency
    const currencyInfo = getCurrencyInfo(currency)
    
    const formattedAmount = new Intl.NumberFormat('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
    
    return `${currencyInfo.symbol}${formattedAmount}`
  }, [selectedCurrency])

  // 获取汇率缓存键
  const getRateKey = (from: CurrencyCode, to: CurrencyCode) => `${from}-${to}`

  // 检查缓存是否有效
  const isCacheValid = (cacheItem: CacheItem | undefined): boolean => {
    if (!cacheItem) return false
    const now = Date.now()
    return (now - cacheItem.timestamp) < CACHE_DURATION
  }

  // 从API获取单个汇率（带去重和缓存）
  const fetchExchangeRate = async (fromCurrency: CurrencyCode, toCurrency: CurrencyCode): Promise<number> => {
    if (fromCurrency === toCurrency) return 1

    const rateKey = getRateKey(fromCurrency, toCurrency)
    
    // 1. 首先检查有效缓存
    const cachedItem = rateCache.current.get(rateKey)
    if (isCacheValid(cachedItem)) {
      return cachedItem!.rate
    }

    // 2. 检查是否有正在进行的相同请求
    if (pendingRequests.current.has(rateKey)) {
      return pendingRequests.current.get(rateKey)!
    }

    // 3. 创建新请求
    const requestPromise = (async (): Promise<number> => {
      try {
        // 使用AbortController处理超时
        const abortController = new AbortController()
        activeControllers.current.set(rateKey, abortController)
        
        const timeoutId = setTimeout(() => {
          abortController.abort()
        }, REQUEST_TIMEOUT)
        
        try {
          const response = await fetch(`/api/v1/get_foreign_currency_rate?from_currency=${fromCurrency}&to_currency=${toCurrency}&amount=1`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            signal: abortController.signal
          })
          
          clearTimeout(timeoutId)
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          const data = await response.json()
          
          if (!data.success) {
            throw new Error(data.error || '获取汇率失败')
          }
          
          const rate = parseFloat(data.data.converted_amount)
          if (isNaN(rate) || rate <= 0) {
            throw new Error('无效的汇率数据')
          }
          
          const now = Date.now()
          
          // 更新缓存
          rateCache.current.set(rateKey, { rate, timestamp: now })
          
          // 更新状态中的汇率
          setExchangeRates(prev => ({
            ...prev,
            [rateKey]: rate
          }))
          
          return rate
        } catch (fetchError) {
          clearTimeout(timeoutId)
          throw fetchError
        }
      } catch (error) {
        // 检查是否有过期的缓存可以使用
        const expiredCache = rateCache.current.get(rateKey)
        if (expiredCache) {
          return expiredCache.rate
        }
        
        // 汇率获取失败，显示错误提示
        toast.error(`汇率加载失败: ${fromCurrency} → ${toCurrency}`)
        
        // 返回1作为默认值，避免计算错误
        return 1
      } finally {
        // 清理正在进行的请求和控制器
        pendingRequests.current.delete(rateKey)
        activeControllers.current.delete(rateKey)
      }
    })()

    // 将请求加入去重列表
    pendingRequests.current.set(rateKey, requestPromise)
    
    return requestPromise
  }

  // 货币转换函数
  const convertCurrency = useCallback(async (
    amount: number, 
    fromCurrency: CurrencyCode, 
    toCurrency?: CurrencyCode
  ): Promise<number> => {
    const targetCurrency = toCurrency || selectedCurrency
    
    if (fromCurrency === targetCurrency) {
      return amount
    }
    
    try {
      const rate = await fetchExchangeRate(fromCurrency, targetCurrency)
      const convertedAmount = amount * rate
      
      return convertedAmount
    } catch (error) {
      console.error('货币转换失败:', error)
      return amount
    }
  }, [selectedCurrency])

  // 批量刷新所有汇率
  const refreshExchangeRates = useCallback(async () => {
    if (isLoadingRates) {
      return
    }

    setIsLoadingRates(true)
    
    try {
      const currencies: CurrencyCode[] = ['CNY', 'USD', 'HKD']
      
      // 序列化执行汇率请求，避免并发问题
      for (const from of currencies) {
        for (const to of currencies) {
          if (from !== to) {
            try {
              await fetchExchangeRate(from, to)
              // 在请求之间添加小延迟，避免过多并发
              await new Promise(resolve => setTimeout(resolve, 100))
            } catch (error) {
              // 静默处理错误，具体错误已在fetchExchangeRate中处理
            }
          }
        }
      }
      
      // 更新版本号
      setRatesVersion(prev => prev + 1)
      
    } catch (error) {
      toast.error('汇率刷新失败')
    } finally {
      setIsLoadingRates(false)
    }
  }, [isLoadingRates])

  // 更新共享数据函数
  const updateSharedData = useCallback((key: keyof SharedDataType, data: any) => {
    setSharedData(prev => ({
      ...prev,
      [key]: data
    }))
  }, [])

  // 获取资产数据的函数 - 现在只获取assets，价格信息包含在其中
  const fetchAllData = useCallback(async (): Promise<void> => {
    const requestKey = 'assets-fetch'
    
    // 简单的防重复请求
    if (pendingDataRequests.current.has(requestKey)) {
      return
    }
    
    const USER_ID = 'test_user_001'
    
    // 标记请求开始
    const requestStartTime = Date.now()
    pendingDataRequests.current.set(requestKey, Promise.resolve())
    
    try {
      // 只需要获取资产数据，价格信息包含在assets的price字段中
      const assetsUrl = `/api/v1/assets/info?userId=${encodeURIComponent(USER_ID)}`
      
      const assetsResponse = await fetch(assetsUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })

      const requestEndTime = Date.now()
      const requestDuration = requestEndTime - requestStartTime

      let assets: any[] = []

      // 处理资产数据响应
      if (assetsResponse.ok) {
        try {
          const assetsData = await assetsResponse.json()
          if (assetsData.success && Array.isArray(assetsData.data)) {
            assets = assetsData.data
          }
        } catch (error) {
          // 静默处理错误
        }
      }

      // 更新共享数据 - 只更新assets数据
      updateSharedData('assets', assets)

    } catch (error) {
      // 错误时设为空数据
      updateSharedData('assets', [])
    } finally {
      // 清理请求标记
      pendingDataRequests.current.delete(requestKey)
    }
  }, [updateSharedData])

  // 数据刷新函数 - 使用useRef避免依赖循环
  const refreshAssetData = useCallback(async () => {
    if (isRefreshing) {
      return
    }

    setIsRefreshing(true)
    const isFirstLoad = isInitialLoad
    
    try {
      await fetchAllData()
      setLastRefreshTime(new Date())
      
      if (isFirstLoad) {
        setIsInitialLoad(false)
      }
    } catch (error) {
      // 静默处理错误
    } finally {
      setIsRefreshing(false)
    }
  }, [isRefreshing, isInitialLoad, fetchAllData])

  // 强制刷新资产数据 - 不检查isRefreshing状态，立即执行
  const forceRefreshAssetData = useCallback(async () => {
    console.log('🔄 强制刷新资产数据')
    
    // 暂时设置刷新状态，但不阻止执行
    setIsRefreshing(true)
    
    try {
      // 清除正在进行的请求，确保立即重新获取
      const requestKey = 'assets-fetch'
      pendingDataRequests.current.delete(requestKey)
      
      await fetchAllData()
      setLastRefreshTime(new Date())
      
      console.log('✅ 强制刷新完成')
    } catch (error) {
      console.error('❌ 强制刷新失败:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [fetchAllData])

  // 处理货币切换
  const handleCurrencyChange = useCallback((newCurrency: CurrencyCode) => {
    setSelectedCurrency(newCurrency)
  }, [selectedCurrency])

  // 初始化汇率（仅一次）
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      refreshExchangeRates()
    }
  }, [refreshExchangeRates])

  // 自动刷新资产数据 - 减少刷新频率并避免依赖循环
  useEffect(() => {
    // 初始加载
    refreshAssetData()
    
    // 设置定时器，10秒刷新
    const refreshInterval = setInterval(() => {
      refreshAssetData()
    }, 10000) // 10秒刷新

    return () => {
      clearInterval(refreshInterval)
    }
  }, []) // 移除refreshAssetData依赖，避免无限重渲染

  // 定期清理过期缓存
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now()
      
      for (const [key, cacheItem] of rateCache.current.entries()) {
        if (!isCacheValid(cacheItem)) {
          rateCache.current.delete(key)
        }
      }
    }, CACHE_DURATION) // 每5分钟清理一次

    return () => clearInterval(cleanupInterval)
  }, [])

  // 组件卸载时清理所有正在进行的请求
  useEffect(() => {
    return () => {
      // 取消所有正在进行的请求
      for (const controller of activeControllers.current.values()) {
        controller.abort()
      }
      activeControllers.current.clear()
      pendingRequests.current.clear()
      pendingDataRequests.current.clear()
    }
  }, [])

  const value: CombinedContextType = {
    selectedCurrency,
    setSelectedCurrency: handleCurrencyChange,
    getCurrencyInfo,
    formatCurrency,
    exchangeRates,
    convertCurrency,
    refreshExchangeRates,
    isLoadingRates,
    ratesVersion,
    // 数据刷新相关
    refreshAssetData,
    forceRefreshAssetData,  // 新增：强制刷新接口
    isRefreshing,
    lastRefreshTime,
    isInitialLoad,
    // 共享数据
    sharedData,
    updateSharedData
  }

  return (
    <CurrencyContext.Provider value={value}>
      <DataRefreshContext.Provider value={value}>
        {children}
      </DataRefreshContext.Provider>
    </CurrencyContext.Provider>
  )
}