import * as React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { ArrowUpIcon, ArrowDownIcon, DollarSign, TrendingUp, Users, Activity, AlertCircle } from "lucide-react"
import { Skeleton } from "./ui/skeleton"
import { Alert, AlertDescription } from "./ui/alert"
import { apiService, CURRENT_USER_ID } from "../services/api"
import { buildAssetTree } from "../utils/assetUtils"
import { useCurrency, useDataRefresh, CurrencyCode } from "../contexts/CurrencyContext"

interface SummaryData {
  totalAssets: number
  totalValue: number
  totalGrowth: number
  activeAssets: number
  portfolioCount: number
}

export function SummaryCards() {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { selectedCurrency, formatCurrency, convertCurrency } = useCurrency()
  const { isInitialLoad } = useDataRefresh()

  const loadSummaryData = async () => {
    try {
      // 只在初次加载时显示loading状态
      if (isInitialLoad) {
        setLoading(true)
      }
      setError(null)
      
      const assetsResponse = await apiService.getAssets(CURRENT_USER_ID)

      if (!assetsResponse.success) {
        throw new Error(assetsResponse.error || '获取资产数据失败')
      }

      const assets = assetsResponse.data || []
      const assetTree = buildAssetTree(assets) // 不再传递prices参数，因为价格信息已经在assets中

      // 计算统计数据
      let totalValue = 0
      let totalCost = 0
      let activeAssets = 0
      let portfolioCount = 0

      // 统计不同类型的资产数量
      const processAsset = async (asset: any) => {
        if (asset.type === 'group') {
          portfolioCount++
        } else if (asset.type !== 'group' && asset.quantity > 0) {
          activeAssets++
          
          // 使用资产的当前价格(如果有)或成本价格计算总价值
          const currentPrice = asset.price || (asset.remain_cost / asset.quantity)
          const assetValue = asset.quantity * currentPrice
          
          // 转换货币
          const assetCurrency = (asset.currency || 'CNY') as CurrencyCode
          const convertedValue = await convertCurrency(assetValue, assetCurrency, selectedCurrency)
          const convertedCost = await convertCurrency(asset.remain_cost, assetCurrency, selectedCurrency)
          
          totalValue += convertedValue
          totalCost += convertedCost
        }
      }

      // 处理所有资产
      for (const asset of assets) {
        await processAsset(asset)
      }

      // 计算增长率
      const totalGrowth = totalCost > 0 ? ((totalValue - totalCost) / totalCost * 100) : 0

      setSummaryData({
        totalAssets: assets.filter(asset => asset.type !== 'group').length, // 排除资产组
        totalValue,
        totalGrowth,
        activeAssets,
        portfolioCount
      })
      
    } catch (error) {
      setError(error instanceof Error ? error.message : '加载统计数据失败')
      console.error('加载统计数据失败:', error)
    } finally {
      // 只在初次加载时才设置loading为false
      if (isInitialLoad) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    loadSummaryData()
  }, [selectedCurrency, isInitialLoad])

  const formatSummaryCurrency = (value: number) => {
    return formatCurrency(Math.round(value), selectedCurrency)
  }

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(2)}%`
  }

  if (loading && isInitialLoad) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          {/* 移除手动重试按钮，使用全局自动刷新 */}
        </AlertDescription>
      </Alert>
    )
  }

  if (!summaryData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>暂无统计数据</p>
      </div>
    )
  }

  const cards = [
    {
      title: "总资产价值",
      value: formatSummaryCurrency(summaryData.totalValue),
      change: formatPercentage(summaryData.totalGrowth),
      changeType: summaryData.totalGrowth >= 0 ? "positive" : "negative",
      icon: DollarSign,
      description: "较成本"
    },
    {
      title: "收益率",
      value: formatPercentage(summaryData.totalGrowth),
      change: summaryData.totalGrowth >= 0 ? "盈利" : "亏损",
      changeType: summaryData.totalGrowth >= 0 ? "positive" : "negative",
      icon: TrendingUp,
      description: "总体表现"
    },
    {
      title: "资产组合",
      value: summaryData.portfolioCount.toString(),
      change: `${summaryData.activeAssets} 个资产`,
      changeType: "neutral" as const,
      icon: Users,
      description: "投资组合"
    },
    {
      title: "总资产数",
      value: summaryData.totalAssets.toString(),
      change: `${summaryData.activeAssets} 个活跃`,
      changeType: "neutral" as const,
      icon: Activity,
      description: "资产项目"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">{card.value}</div>
            <div className="flex items-center space-x-2">
              {card.changeType !== "neutral" && (
                <>
                  {card.changeType === "positive" ? (
                    <ArrowUpIcon className="w-4 h-4 text-green-600" />
                  ) : (
                    <ArrowDownIcon className="w-4 h-4 text-red-600" />
                  )}
                  <Badge 
                    className={
                      card.changeType === "positive" 
                        ? "bg-green-100 text-green-800 border-green-200" 
                        : "bg-red-100 text-red-800 border-red-200"
                    }
                  >
                    {card.change}
                  </Badge>
                </>
              )}
              {card.changeType === "neutral" && (
                <span className="text-sm text-muted-foreground">{card.change}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}