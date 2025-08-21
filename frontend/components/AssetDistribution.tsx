import * as React from "react"
import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { AlertCircle, Wifi, WifiOff, TrendingUp, Filter } from "lucide-react"
import { Alert, AlertDescription } from "./ui/alert"
import { buildAssetTree } from "../utils/assetUtils"
import { useCurrency, useDataRefresh } from "../contexts/CurrencyContext"
import { CHART_COLORS } from "../utils/chartColors"
import { DistributionData, AssetDistributionProps } from "../utils/distributionTypes"
import { 
  calculateConvertedNodeTotalValue, 
  getDistributionNodes 
} from "../utils/distributionUtils"
import { CustomTooltip } from "./AssetDistribution/CustomTooltip"

export function AssetDistribution({ selectedNodes = new Set() }: AssetDistributionProps) {
  const [distributionData, setDistributionData] = useState<DistributionData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [totalValue, setTotalValue] = useState(0)
  const [isFiltered, setIsFiltered] = useState(false)
  const [localAssets, setLocalAssets] = useState<any[]>([])
  
  const { selectedCurrency, formatCurrency, convertCurrency } = useCurrency()
  const { isInitialLoad, sharedData } = useDataRefresh()

  // 使用共享数据构建资产树
  const availableAssets = useMemo(() => {
    if (localAssets.length > 0) {
      const tree = buildAssetTree(localAssets)
      return tree
    }
    return []
  }, [localAssets])

  // 计算分布数据（基于选中状态）
  const calculateDistribution = useCallback(async () => {
    try {
      if (isInitialLoad) {
        setLoading(true)
      }
      setError(null)
      
      const distributionNodes = getDistributionNodes(selectedNodes, availableAssets)
      const filtered = selectedNodes.size > 0
      setIsFiltered(filtered)
      
      // 如果没有可用资产，直接清空数据
      if (availableAssets.length === 0) {
        setDistributionData([])
        setTotalValue(0)
        setIsConnected(false)
        return
      }
      
      const distribution: DistributionData[] = []
      let total = 0

      for (let index = 0; index < distributionNodes.length; index++) {
        const node = distributionNodes[index]
        const convertedNodeValue = await calculateConvertedNodeTotalValue(
          node, 
          convertCurrency, 
          selectedCurrency
        )
        
        if (convertedNodeValue > 0) {
          distribution.push({
            name: node.name,
            value: convertedNodeValue,
            currency: selectedCurrency,
            color: CHART_COLORS[index % CHART_COLORS.length],
            percentage: 0
          })
          total += convertedNodeValue
        }
      }

      distribution.forEach(item => {
        item.percentage = total > 0 ? (item.value / total) * 100 : 0
      })

      setDistributionData(distribution)
      setTotalValue(total)
      
      // 如果有数据则设置为连接状态
      if (availableAssets.length > 0) {
        setIsConnected(true)
      }
      
    } catch (error) {
      setError(error instanceof Error ? error.message : '计算失败')
      setDistributionData([])
      setTotalValue(0)
    } finally {
      if (isInitialLoad) {
        setLoading(false)
      }
    }
  }, [selectedNodes, availableAssets, selectedCurrency, convertCurrency, isInitialLoad])

  // 监听共享数据更新
  useEffect(() => {
    if (sharedData.assets && localAssets !== sharedData.assets) {
      setLocalAssets(sharedData.assets)
      setIsConnected(true)
    }
  }, [sharedData.assets, localAssets])

  // 监听选中状态和资产数据变化
  useEffect(() => {
    calculateDistribution()
  }, [calculateDistribution])

  const formatDistributionCurrency = (value: number) => {
    return formatCurrency(value, selectedCurrency)
  }

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="font-bold">资产分布</CardTitle>
            {isFiltered && (
              <Badge className="text-xs gap-1 bg-blue-100 text-blue-800 border-blue-200">
                <Filter className="w-3 h-3" />
                筛选
              </Badge>
            )}
            {isConnected ? (
              <Badge className="text-xs gap-1 bg-green-100 text-green-800 border-green-200">
                <Wifi className="w-3 h-3" />
                在线
              </Badge>
            ) : (
              <Badge className="text-xs gap-1 bg-red-100 text-red-800 border-red-200">
                <WifiOff className="w-3 h-3" />
                离线
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className={`transition-opacity duration-300 ${loading && isInitialLoad ? 'opacity-60' : 'opacity-100'}`}>
        {error ? (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        ) : distributionData.length > 0 ? (
          <div className="space-y-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={
                      <CustomTooltip 
                        formatCurrency={formatDistributionCurrency}
                        formatPercentage={formatPercentage}
                      />
                    } 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="text-center border-t pt-4">
              <div className="text-sm text-muted-foreground">
                {isFiltered ? '筛选' : '资产'}总价值
              </div>
              <div className="text-xl font-bold">
                {formatDistributionCurrency(totalValue)}
              </div>
            </div>

            <div className="space-y-3">
              {distributionData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatPercentage(item.percentage)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistributionCurrency(item.value)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>暂无资产分布数据</p>
            <p className="text-sm">
              {isConnected 
                ? (isFiltered ? '请选择包含资产的项目' : '请先添加资产数据')
                : '等待数据加载'
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}