import * as React from "react"
import { useState, useEffect } from "react"
import { ArrowUpIcon, ArrowDownIcon, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Skeleton } from "./ui/skeleton"
import { Button } from "./ui/button"
import { AssetTree } from "./AssetTree"
import { AssetDistribution } from "./AssetDistribution"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { buildAssetTree, AssetNode } from "../utils/assetUtils"
import { useCurrency, useDataRefresh, CurrencyCode } from "../contexts/CurrencyContext"
import { apiService, PriceTracingData } from "../services/api"

interface PortfolioData {
  totalValue: number
  totalGrowth: number
  totalAssets: number
  activeAssets: number
}

interface ChartDataPoint {
  date: string
  price: number
  formattedDate: string
}

interface HeroSectionProps {
  onAddTransactionRequest?: (assetId: string, assetName: string) => void
}

export function HeroSection({ onAddTransactionRequest }: HeroSectionProps) {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAssetNodes, setSelectedAssetNodes] = useState<Set<string>>(new Set())
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [chartLoading, setChartLoading] = useState(true)
  const [chartError, setChartError] = useState<string | null>(null)
  
  const { selectedCurrency, formatCurrency, convertCurrency } = useCurrency()
  const { isInitialLoad, sharedData } = useDataRefresh()

  // 计算投资组合数据的统一函数
  const calculatePortfolioFromAssets = async (assetTree: AssetNode[], assets: any[]) => {
    let totalValue = 0
    let totalCost = 0
    let activeAssets = 0

    const processNode = async (nodes: any[]) => {
      for (const node of nodes) {
        if (node.children && node.children.length > 0) {
          await processNode(node.children)
        } else if (node.value && node.value > 0) {
          activeAssets++
          
          // 正确处理每个资产的货币转换
          const assetCurrency = (node.currency || 'CNY') as CurrencyCode
          const convertedValue = await convertCurrency(node.value, assetCurrency, selectedCurrency)
          totalValue += convertedValue
          
          if (node.quantity && node.cost) {
            const costValue = node.quantity * node.cost
            const convertedCost = await convertCurrency(costValue, assetCurrency, selectedCurrency)
            totalCost += convertedCost
          }
        }
      }
    }

    await processNode(assetTree)
    
    const totalGrowth = totalCost > 0 ? ((totalValue - totalCost) / totalCost * 100) : 0

    const portfolioResult = {
      totalValue: totalValue,
      totalGrowth,
      totalAssets: assets.length,
      activeAssets
    }
    
    setPortfolioData(portfolioResult)
  }

  const loadPortfolioData = async () => {
    try {
      // 只在初次加载时显示loading状态
      if (isInitialLoad) {
        setLoading(true)
      }
      
      if (sharedData.assets && Array.isArray(sharedData.assets)) {
        const assets = sharedData.assets
        const assetTree = buildAssetTree(assets)
        
        await calculatePortfolioFromAssets(assetTree, assets)
        return
      }

      // 如果没有共享数据，说明还在初次加载中，数据会通过context获取
      
    } catch (error) {
      // 静默处理错误
    } finally {
      // 只在初次加载时才设置loading为false
      if (isInitialLoad) {
        setLoading(false)
      }
    }
  }

  // 加载价格趋势数据
  const loadPriceData = async () => {
    try {
      setChartLoading(true)
      setChartError(null)
      
      // 使用accountId=0获取总资产价格数据
      const response = await apiService.getPriceTracingData('0')
      
      if (!response.success) {
        throw new Error(response.error || '获取价格数据失败')
      }

      if (response.data && response.data.price_tracing) {
        // 转换数据格式为图表可用的格式
        const processedData: ChartDataPoint[] = response.data.price_tracing.map((item: PriceTracingData) => {
          const date = new Date(item.date)
          return {
            date: item.date,
            price: parseFloat(item.price),
            formattedDate: date.toLocaleDateString('zh-CN', {
              month: 'short',
              day: 'numeric'
            })
          }
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // 按日期排序

        setChartData(processedData)
      } else {
        setChartData([])
      }
    } catch (error) {
      console.error('Failed to load price data:', error)
      setChartError(error instanceof Error ? error.message : '加载价格数据失败')
    } finally {
      setChartLoading(false)
    }
  }

  useEffect(() => {
    loadPortfolioData()
  }, [selectedCurrency, isInitialLoad, sharedData.assets])

  useEffect(() => {
    loadPriceData()
  }, [])

  const formatPortfolioValue = (value: number) => {
    if (value >= 1000000) {
      return formatCurrency(value / 1000000).replace(/[\d,.-]+/, match => `${match}M`)
    } else if (value >= 1000) {
      return formatCurrency(value / 1000).replace(/[\d,.-]+/, match => `${match}K`)
    }
    return formatCurrency(Math.round(value))
  }

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  // 格式化价格显示
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // 使用原始date字符串而不是label来创建Date对象
      const dataPoint = payload[0].payload
      const date = new Date(dataPoint.date)
      
      // 检查日期是否有效
      if (isNaN(date.getTime())) {
        console.warn('Invalid date in tooltip:', dataPoint.date)
        return null
      }
      
      const formattedDate = date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      const formattedTime = date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      })

      return (
        <div className="bg-white/95 backdrop-blur border border-white/20 rounded-lg p-3 shadow-lg">
          <p className="text-sm text-gray-600">{formattedDate}</p>
          <p className="text-xs text-gray-500">{formattedTime}</p>
          <p className="text-sm font-medium text-gray-900">
            价格: ¥{formatPrice(payload[0].value)}
          </p>
        </div>
      )
    }
    return null
  }
  
  // 处理资产选择变化
  const handleSelectedNodesChange = (selectedNodes: Set<string>) => {
    setSelectedAssetNodes(selectedNodes)
  }

  return (
    <div className="space-y-6">
      {/* Main Hero Card */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-white/90 mb-2">投资组合总价值</CardTitle>
              <div className="flex items-center space-x-3">
                {loading && isInitialLoad ? (
                  <Skeleton className="h-8 w-32 bg-white/20" />
                ) : (
                  <>
                    <span className="text-3xl font-bold">
                      {portfolioData ? formatPortfolioValue(portfolioData.totalValue) : formatCurrency(0)}
                    </span>
                    {portfolioData && portfolioData.totalGrowth !== 0 && (
                      <Badge className={`${
                        portfolioData.totalGrowth >= 0 
                          ? 'bg-green-500/20 text-green-100 border-green-500/30' 
                          : 'bg-red-500/20 text-red-100 border-red-500/30'
                      }`}>
                        {portfolioData.totalGrowth >= 0 ? (
                          <ArrowUpIcon className="w-3 h-3 mr-1" />
                        ) : (
                          <ArrowDownIcon className="w-3 h-3 mr-1" />
                        )}
                        {formatPercentage(portfolioData.totalGrowth)}
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </div>
            {/* 移除手动刷新按钮，使用全局自动刷新 */}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[200px] w-full">
            {chartLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="flex items-center gap-2 text-white/70">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  加载价格数据中...
                </div>
              </div>
            ) : chartError ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-white/70">
                  <p className="mb-2">无法加载价格数据</p>
                  <p className="text-sm">{chartError}</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 text-white/70 hover:text-white hover:bg-white/10"
                    onClick={loadPriceData}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    重试
                  </Button>
                </div>
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-white/70">
                  <p className="mb-2">暂无价格数据</p>
                  <p className="text-sm">数据将在后端连接后显示</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 30,
                    left: 60,  // 增加左边距确保Y轴标签显示完整
                    bottom: 10,
                  }}
                >
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgba(255, 255, 255, 0.8)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="rgba(255, 255, 255, 0.2)" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis 
                    dataKey="formattedDate"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'rgba(255, 255, 255, 0.7)' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'rgba(255, 255, 255, 0.7)' }}
                    tickFormatter={(value) => `¥${formatPrice(value)}`}
                    width={50}  // 固定Y轴宽度
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="rgba(255, 255, 255, 0.9)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#priceGradient)"
                    style={{ outline: 'none' }}  // 移除focus outline
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 资产树和资产分布布局：手机端垂直堆叠，桌面端70% + 30% */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:flex-[7]">
          <AssetTree 
            onSelectedNodesChange={handleSelectedNodesChange}
            onAddTransactionRequest={onAddTransactionRequest}
          />
        </div>
        <div className="w-full lg:flex-[3]">
          <AssetDistribution 
            selectedNodes={selectedAssetNodes}
          />
        </div>
      </div>
    </div>
  )
}