import * as React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog"
import { Label } from "./ui/label"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "./ui/pagination"
import { Search, RefreshCw, AlertCircle, ArrowDownIcon, ArrowUpIcon, Calendar, Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { Skeleton } from "./ui/skeleton"
import { Alert, AlertDescription } from "./ui/alert"
import { DatePicker } from "./DatePicker"
import { toast } from "sonner"
import { apiService, CURRENT_USER_ID, Transaction, Asset } from "../services/api"
import { ASSET_TYPES } from "../utils/assetTypes"

interface DataTableProps {
  addTransactionRequest?: {
    assetId: string
    assetName: string
  } | null
  onClearAddTransactionRequest?: () => void
}

export function DataTable({ addTransactionRequest, onClearAddTransactionRequest }: DataTableProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [assets, setAssets] = useState<Asset[]>([]) // 存储资产数据用于匹配账户信息
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [directionFilter, setDirectionFilter] = useState("all")
  const [accountFilter, setAccountFilter] = useState("all")
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [accountIds, setAccountIds] = useState<string[]>([])
  const [accountMap, setAccountMap] = useState<Map<string, string>>(new Map()) // accountId -> description
  
  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  
  // 新增交易对话框状态
  const [addTransactionOpen, setAddTransactionOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([])
  const [transactionForm, setTransactionForm] = useState({
    accountId: '',
    direction: 0 as 0 | 1,  // 0=买入，1=卖出
    quantity: '',
    price: '',
    currency: 'CNY',
    description: '',
    quantityMode: 'change' as 'change' | 'target',  // 新增：份额模式，change=变化，target=补齐
    date: undefined as Date | undefined  // 新增：交易时间，使用Date类型
  })

  // 获取账户描述，如果找不到则返回原始账户ID - 移到前面定义
  const getAccountDescription = (accountId: string): string => {
    return accountMap.get(accountId) || accountId
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // 同时加载交易记录和资产数据
      const [transactionsResult, assetsResult] = await Promise.all([
        loadTransactions(),
        loadAssets()
      ])
      
    } catch (error) {
      setError(error instanceof Error ? error.message : '加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  // 加载可用资产列表（用于新增交易）
  const loadAvailableAssets = async () => {
    try {
      const response = await apiService.getAssets(CURRENT_USER_ID)
      if (response.success) {
        // 只显示非组类型的资产
        const assetList = (response.data || []).filter(asset => asset.type !== 'group')
        setAvailableAssets(assetList)
      }
    } catch (error) {
      // 静默处理加载资产列表失败
    }
  }

  const loadTransactions = async () => {
    // 构建查询参数 - 使用新的分页参数
    const params: any = {
      userId: CURRENT_USER_ID,
      page_index: currentPage - 1,  // API使用0开始的索引
      page_size: pageSize
    }
    
    if (accountFilter !== "all") {
      params.accountId = accountFilter
    }
    
    if (startDate) {
      params.start_date = startDate.toISOString()
    }
    
    if (endDate) {
      params.end_date = endDate.toISOString()
    }
    
    const response = await apiService.getTransactions(params)
    
    if (!response.success) {
      throw new Error(response.error || '获取交易记录失败')
    }

    const responseData = response.data
    if (responseData) {
      // 处理新的API响应格式：data包含transactions和pagination
      setTransactions(responseData.transactions || [])
      setTotalCount(responseData.pagination?.total_count || 0)
      setTotalPages(responseData.pagination?.total_pages || 0)
      
      // 提取唯一的账户ID用于筛选
      const uniqueAccountIds = [...new Set((responseData.transactions || []).map(t => t.accountId))]
      setAccountIds(uniqueAccountIds)
    } else {
      setTransactions([])
      setTotalCount(0)
      setTotalPages(0)
      setAccountIds([])
    }
    
    return responseData?.transactions || []
  }

  const loadAssets = async () => {
    const response = await apiService.getAssets(CURRENT_USER_ID)
    

    
    if (!response.success) {
      return []
    }

    const assetData = response.data || []
    setAssets(assetData)
    
    // 构建账户ID到description的映射
    const newAccountMap = new Map<string, string>()
    assetData.forEach(asset => {
      if (asset.id && asset.description) {
        newAccountMap.set(asset.id, asset.description)
      }
    })
    setAccountMap(newAccountMap)
    
    return assetData
  }

  useEffect(() => {
    loadData()
  }, [])

  // 监听来自AssetTree的添加交易请求
  useEffect(() => {
    if (addTransactionRequest) {
      handleAddTransaction(addTransactionRequest.assetId)
      // 清除请求
      if (onClearAddTransactionRequest) {
        onClearAddTransactionRequest()
      }
    }
  }, [addTransactionRequest])

  // 当筛选条件变化时，重新加载交易数据
  useEffect(() => {
    if (!loading) {  // 避免初始加载时重复请求
      const timeoutId = setTimeout(() => {
        loadTransactions().catch(error => {
          setError(error instanceof Error ? error.message : '加载交易记录失败')
        })
      }, 300) // 添加防抖，避免频繁请求
      
      return () => clearTimeout(timeoutId)
    }
  }, [accountFilter, startDate, endDate])

  // 分页相关useEffect
  useEffect(() => {
    if (!loading) {
      loadTransactions().catch(error => {
        setError(error instanceof Error ? error.message : '加载交易记录失败')
      })
    }
  }, [currentPage, pageSize])

  // 当筛选条件变化时，重置页码到第一页
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [accountFilter, startDate, endDate, directionFilter, searchTerm])

  // 处理页码变化
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  // 处理页面大小变化
  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize))
    setCurrentPage(1) // 重置到第一页
  }

  const filteredData = transactions.filter(transaction => {
    const accountDescription = getAccountDescription(transaction.accountId)
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.accountId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         accountDescription.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDirection = directionFilter === "all" || 
                           (directionFilter === "in" && transaction.direction === 0) ||
                           (directionFilter === "out" && transaction.direction === 1)
    return matchesSearch && matchesDirection
  })

  const getDirectionBadge = (direction: 0 | 1) => {
    return direction === 0 ? (
      <Badge className="bg-green-100 text-green-800 border-green-200 gap-1">
        <ArrowDownIcon className="w-3 h-3" />
        入账
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 border-red-200 gap-1">
        <ArrowUpIcon className="w-3 h-3" />
        出账
      </Badge>
    )
  }

  const formatCurrency = (value: string, currency: string) => {
    const numValue = parseFloat(value)
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue)
  }

  // 新增纯数字格式化函数，不显示货币符号
  const formatNumber = (value: string) => {
    const numValue = parseFloat(value)
    return new Intl.NumberFormat('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue)
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'  // 添加秒的显示
    })
  }

  const formatQuantity = (quantity: string) => {
    const numValue = parseFloat(quantity)
    return numValue.toLocaleString('zh-CN')
  }

  const calculateTotal = (quantity: string, price: string) => {
    const total = parseFloat(quantity) * parseFloat(price)
    return total
  }

  const clearDateFilters = () => {
    setStartDate(undefined)
    setEndDate(undefined)
  }

  // 处理新增交易
  const handleAddTransaction = (prefilledAssetId?: string) => {
    // 预填当前日期
    const now = new Date()
    
    // 如果有预填充的资产ID，需要先找到对应的资产来设置货币单位
    let currency = 'CNY' // 默认货币
    if (prefilledAssetId) {
      const selectedAsset = availableAssets.find(asset => asset.id === prefilledAssetId)
      currency = selectedAsset ? selectedAsset.currency || 'CNY' : 'CNY'
    }
    
    setTransactionForm(prev => ({
      ...prev,
      date: now,
      accountId: prefilledAssetId || '',
      currency: currency
    }))
    
    setAddTransactionOpen(true)
    loadAvailableAssets()
  }

  // 重置交易表单
  const resetTransactionForm = () => {
    // 设置默认的当前日期
    const now = new Date()
    
    setTransactionForm({
      accountId: '',
      direction: 0,
      quantity: '',
      price: '',
      currency: 'CNY',
      description: '',
      quantityMode: 'change',
      date: now
    })
  }

  // 提交新增交易
  const handleSubmitTransaction = async () => {
    // 表单验证
    if (!transactionForm.accountId) {
      toast.error('请选择资产')
      return
    }
    if (!transactionForm.quantity || parseFloat(transactionForm.quantity) <= 0) {
      const selectedAsset = availableAssets.find(asset => asset.id === transactionForm.accountId)
      const isCashAccount = selectedAsset?.type === ASSET_TYPES.CASH
      
      if (isCashAccount && transactionForm.quantityMode === 'target') {
        toast.error('请输入有效的目标数量')
      } else {
        toast.error('请输入有效的份额')
      }
      return
    }

    // 获取选择的资产信息
    const selectedAsset = availableAssets.find(asset => asset.id === transactionForm.accountId)
    const isCashAccount = selectedAsset?.type === ASSET_TYPES.CASH
    
    // 计算最终价格和份额
    let finalPrice = isCashAccount ? 1.00 : parseFloat(transactionForm.price)
    let finalQuantity = parseFloat(transactionForm.quantity)
    
    // 对于现金账户，如果是补齐模式，需要计算变化份额
    if (isCashAccount && transactionForm.quantityMode === 'target') {
      const currentQuantity = parseFloat(String(selectedAsset?.quantity || '0'))
      const targetQuantity = finalQuantity
      finalQuantity = targetQuantity - currentQuantity
      
      // 检查计算后的变化数量是否有效
      if (Math.abs(finalQuantity) < 0.01) {
        toast.error('目标数量与当前数量相同，无需交易')
        return
      }
      
      // 补齐模式下自动设置交易方向：正数为买入，负数为卖出
      if (finalQuantity >= 0) {
        transactionForm.direction = 0  // 买入
      } else {
        transactionForm.direction = 1  // 卖出
        finalQuantity = Math.abs(finalQuantity)  // 取绝对值
      }
    }
    
    // 价格验证（非现金账户）
    if (!isCashAccount && (!transactionForm.price || parseFloat(transactionForm.price) <= 0)) {
      toast.error('请输入有效的价格')
      return
    }

    // 根据选择的资产生成描述
    const description = transactionForm.description || 
      `${transactionForm.direction === 0 ? '买入' : '卖出'} ${selectedAsset?.description || '资产'}`

    try {
      setSubmitting(true)
      
      const response = await apiService.createTransaction({
        userId: CURRENT_USER_ID,
        accountId: transactionForm.accountId,
        direction: transactionForm.direction,
        quantity: finalQuantity,
        price: finalPrice,
        currency: transactionForm.currency,
        description: description,
        date: transactionForm.date ? transactionForm.date.toISOString() : new Date().toISOString()
      })

      if (!response.success) {
        throw new Error(response.error || '创建交易失败')
      }

      toast.success('交易记录添加成功')
      setAddTransactionOpen(false)
      resetTransactionForm()
      await loadData() // 重新加载交易记录
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '添加交易失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-bold">交易记录</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2"
                onClick={loadData}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                重试
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-bold">交易记录</CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="default" 
              size="sm"
              onClick={() => handleAddTransaction()}
              className="gap-1"
            >
              <Plus className="w-4 h-4" />
              新增交易
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={loadData}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className={`transition-opacity duration-300 ${loading ? 'opacity-60' : 'opacity-100'}`}>
        <div className="space-y-4">
          {/* 筛选控件 */}
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="搜索交易描述或变动账户..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有方向</SelectItem>
                <SelectItem value="in">入账</SelectItem>
                <SelectItem value="out">出账</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有账户</SelectItem>
                {accountIds.map(accountId => (
                  <SelectItem key={accountId} value={accountId}>
                    {getAccountDescription(accountId)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <DatePicker
                date={startDate}
                onDateChange={setStartDate}
                placeholder="开始日期"
                className="w-40"
              />
              <DatePicker
                date={endDate}
                onDateChange={setEndDate}
                placeholder="结束日期"
                className="w-40"
              />
              {(startDate || endDate) && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={clearDateFilters}
                  className="px-3"
                >
                  <Calendar className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* 数据表格 */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">交易描述</TableHead>
                  <TableHead className="text-center">变动账户</TableHead>
                  <TableHead className="text-center">交易方向</TableHead>
                  <TableHead className="text-center">数量</TableHead>
                  <TableHead className="text-center">单价</TableHead>
                  <TableHead className="text-center">总额</TableHead>
                  <TableHead className="text-center">货币</TableHead>
                  <TableHead className="text-center">交易时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length > 0 ? (
                  filteredData.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium text-left">
                        {transaction.description}
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {getAccountDescription(transaction.accountId)}
                          </span>
                          {getAccountDescription(transaction.accountId) !== transaction.accountId && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {transaction.accountId}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-left">
                        {getDirectionBadge(transaction.direction)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatQuantity(transaction.quantity)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(transaction.price)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatNumber(calculateTotal(transaction.quantity, transaction.price).toString())}
                      </TableCell>
                      <TableCell className="text-left">{transaction.currency}</TableCell>
                      <TableCell className="text-left text-sm">
                        {formatDateTime(transaction.date)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {searchTerm || directionFilter !== "all" || accountFilter !== "all" || startDate || endDate
                        ? "未找到匹配的交易记录" 
                        : "暂无交易记录"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* 统计信息和分页控件 */}
          <div className="space-y-4">
            {/* 统计信息行 */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="text-sm">
                  第 {currentPage} 页，共 {totalPages} 页 (总计 {totalCount} 条记录)
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm">每页显示</span>
                  <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="w-20 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm">条</span>
                </div>
              </div>
              
              {filteredData.length > 0 && (
                <div className="flex gap-4 text-sm">
                  <span>
                    入账: {filteredData.filter(t => t.direction === 0).length} 笔
                  </span>
                  <span>
                    出账: {filteredData.filter(t => t.direction === 1).length} 笔
                  </span>
                </div>
              )}
            </div>

            {/* 分页导航 */}
            {totalPages > 1 && (
              <div className="flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => handlePageChange(currentPage - 1)}
                        className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {/* 页码按钮 */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage > totalPages - 3) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      
                      if (pageNum < 1 || pageNum > totalPages) return null
                      
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => handlePageChange(pageNum)}
                            isActive={pageNum === currentPage}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    })}
                    
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => handlePageChange(currentPage + 1)}
                        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* 新增交易对话框 */}
      <Dialog open={addTransactionOpen} onOpenChange={setAddTransactionOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              新增交易记录
            </DialogTitle>
            <DialogDescription>
              添加一笔新的交易记录到系统中
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="asset" className="text-right">
                选择资产 *
              </Label>
              <Select 
                value={transactionForm.accountId || undefined} 
                onValueChange={(value) => {
                  // 找到选中的资产
                  const selectedAsset = availableAssets.find(asset => asset.id === value)
                  
                  setTransactionForm(prev => ({ 
                    ...prev, 
                    accountId: value,
                    // 如果选中了资产，自动设置其货币单位
                    currency: selectedAsset ? selectedAsset.currency || 'CNY' : prev.currency
                  }))
                }}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="请选择资产" />
                </SelectTrigger>
                <SelectContent>
                  {availableAssets.map(asset => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 现金账户补齐模式下不显示交易方向 */}
            {(() => {
              const selectedAsset = availableAssets.find(asset => asset.id === transactionForm.accountId)
              const isCashAccount = selectedAsset?.type === ASSET_TYPES.CASH
              const isTargetMode = transactionForm.quantityMode === 'target'
              
              return !(isCashAccount && isTargetMode) ? (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="direction" className="text-right">
                    交易方向 *
                  </Label>
                  <Select 
                    value={transactionForm.direction.toString()} 
                    onValueChange={(value) => setTransactionForm(prev => ({ ...prev, direction: parseInt(value) as 0 | 1 }))}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">
                        <div className="flex items-center gap-2">
                          <ArrowDownIcon className="w-4 h-4 text-green-600" />
                          买入 (入账)
                        </div>
                      </SelectItem>
                      <SelectItem value="1">
                        <div className="flex items-center gap-2">
                          <ArrowUpIcon className="w-4 h-4 text-red-600" />
                          卖出 (出账)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null
            })()}

            {/* 现金账户的份额模式选择 */}
            {(() => {
              const selectedAsset = availableAssets.find(asset => asset.id === transactionForm.accountId)
              const isCashAccount = selectedAsset?.type === ASSET_TYPES.CASH
              
              return isCashAccount ? (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="quantityMode" className="text-right">
                    份额模式 *
                  </Label>
                  <Select 
                    value={transactionForm.quantityMode} 
                    onValueChange={(value) => setTransactionForm(prev => ({ ...prev, quantityMode: value as 'change' | 'target' }))}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="change">变化模式（直接变化数量）</SelectItem>
                      <SelectItem value="target">补齐模式（目标总数量）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null
            })()}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                {(() => {
                  const selectedAsset = availableAssets.find(asset => asset.id === transactionForm.accountId)
                  const isCashAccount = selectedAsset?.type === ASSET_TYPES.CASH
                  
                  if (isCashAccount) {
                    return transactionForm.quantityMode === 'target' ? '目标数量 *' : '变化数量 *'
                  }
                  return '交易份额 *'
                })()}
              </Label>
              <Input
                id="quantity"
                type="number"
                step="0.001"
                value={transactionForm.quantity}
                onChange={(e) => setTransactionForm(prev => ({ ...prev, quantity: e.target.value }))}
                className="col-span-3"
                placeholder={(() => {
                  const selectedAsset = availableAssets.find(asset => asset.id === transactionForm.accountId)
                  const isCashAccount = selectedAsset?.type === ASSET_TYPES.CASH
                  
                  if (isCashAccount) {
                    return transactionForm.quantityMode === 'target' ? '请输入目标数量（基于当前数量计算）' : '请输入变化数量'
                  }
                  return '请输入交易份额'
                })()}
              />
            </div>

            {/* 非现金账户才显示价格输入框 */}
            {(() => {
              const selectedAsset = availableAssets.find(asset => asset.id === transactionForm.accountId)
              const isCashAccount = selectedAsset?.type === ASSET_TYPES.CASH
              
              return !isCashAccount ? (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="price" className="text-right">
                    交易价格 *
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={transactionForm.price}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, price: e.target.value }))}
                    className="col-span-3"
                    placeholder="请输入交易价格"
                  />
                </div>
              ) : null
            })()}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="currency" className="text-right">
                货币单位
              </Label>
              <Select 
                value={transactionForm.currency} 
                onValueChange={(value) => setTransactionForm(prev => ({ ...prev, currency: value }))}
                disabled={!!transactionForm.accountId} // 选择资产后禁用货币选择
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CNY">人民币 (CNY)</SelectItem>
                  <SelectItem value="USD">美元 (USD)</SelectItem>
                  <SelectItem value="HKD">港币 (HKD)</SelectItem>
                  <SelectItem value="EUR">欧元 (EUR)</SelectItem>
                  <SelectItem value="JPY">日元 (JPY)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                交易时间
              </Label>
              <div className="col-span-3">
                <DatePicker
                  date={transactionForm.date}
                  onDateChange={(date) => setTransactionForm(prev => ({ ...prev, date }))}
                  placeholder="请选择交易时间"
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                交易描述
              </Label>
              <Input
                id="description"
                value={transactionForm.description}
                onChange={(e) => setTransactionForm(prev => ({ ...prev, description: e.target.value }))}
                className="col-span-3"
                placeholder="可选，系统会自动生成"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setAddTransactionOpen(false)
                resetTransactionForm()
              }}
            >
              取消
            </Button>
            <Button 
              type="button" 
              onClick={handleSubmitTransaction}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  添加交易
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}