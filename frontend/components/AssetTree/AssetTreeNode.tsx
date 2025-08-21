import * as React from "react"
import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react"
import { useDrag, useDrop } from 'react-dnd'
import { ChevronRight, ChevronDown, Folder, FolderOpen, Move, Banknote, TrendingUp, FileText, Target, Bitcoin, Home, Package, Link } from "lucide-react"
import { ContextMenu, ContextMenuTrigger } from "../ui/context-menu"
import { Badge } from "../ui/badge"
import { AssetNode } from "../../utils/assetUtils"
import { AssetContextMenu } from "./AssetContextMenu"
import { ASSET_TYPES } from "../../utils/assetTypes"
import { useCurrency } from "../../contexts/CurrencyContext"

// --- 接口定义 ---
interface AssetTreeNodeProps {
  node: AssetNode
  level: number
  parentId?: string | null
  expandedNodes: Set<string>
  selectedNodes: Set<string>
  onToggleExpanded: (nodeId: string) => void
  onNodeSelect: (nodeId: string, isCtrlClick?: boolean) => void
  onContextMenu: (action: string, node: AssetNode) => void
  onAssetMove: (draggedNode: AssetNode, targetNode: AssetNode, originalParentId?: string | null) => void
  calculateConvertedValue: (node: AssetNode) => Promise<number>
  calculateConvertedTotalValue: (node: AssetNode) => Promise<number>
}

// --- 过渡状态常量 ---
const FADE_DURATION = 150; // 淡入淡出动画持续时间

// --- 核心组件逻辑 ---
const AssetTreeNodeInner = ({
  node,
  level,
  parentId = null,
  expandedNodes,
  selectedNodes,
  onToggleExpanded,
  onNodeSelect,
  onContextMenu,
  onAssetMove,
  calculateConvertedValue,
  calculateConvertedTotalValue
}: AssetTreeNodeProps) => {
  const { selectedCurrency } = useCurrency()
  const [convertedTotalValue, setConvertedTotalValue] = useState<number>(0)
  
  // 新增：用于控制淡入淡出动画的状态
  const [isFading, setIsFading] = useState(false)

  const [valueCache] = useState<Map<string, number>>(new Map())
  
  // 核心显示值 - 从持久化存储中初始化
  const [displayValue, setDisplayValueState] = useState<number>(() => {
    try {
      const key = `asset-display-${node.id}-${selectedCurrency}`
      const stored = localStorage.getItem(key)
      return stored ? parseFloat(stored) : 0
    } catch {
      return 0
    }
  })
  
  // 用于强制保持Badge可见性的辅助状态
  const [shouldShowBadge, setShouldShowBadge] = useState<boolean>(displayValue > 0)
  
  // 从localStorage获取持久化的显示值
  const getPersistedValue = useCallback(() => {
    try {
      const key = `asset-display-${node.id}-${selectedCurrency}`
      const stored = localStorage.getItem(key)
      if (stored) {
        setShouldShowBadge(true) // 如果有持久化值，确保Badge可见
        return parseFloat(stored)
      }
      return 0
    } catch {
      return 0
    }
  }, [node.id, selectedCurrency])

  // 持久化显示值到localStorage
  const persistValue = useCallback((value: number) => {
    try {
      const key = `asset-display-${node.id}-${selectedCurrency}`
      if (value > 0) {
        localStorage.setItem(key, value.toString())
      }
    } catch {
      // 忽略localStorage错误
    }
  }, [node.id, selectedCurrency])

  // 安全的显示值设置函数
  const safeSetDisplayValue = useCallback((newValue: number) => {
    if (newValue > 0) {
      setShouldShowBadge(true)
      persistValue(newValue)
      setDisplayValueState(prev => {
        // 只有当值的变化足够大时才更新，避免微小差异导致的重渲染
        if (Math.abs(prev - newValue) > 0.5) {
          return newValue
        }
        return prev
      })
    }
  }, [persistValue])

  // 用于防抖和动画的Timer引用
  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isExpanded = expandedNodes.has(node.id)
  const isSelected = selectedNodes.has(node.id)
  const hasChildren = node.children && node.children.length > 0

  const shouldCalculateTotal = useMemo(() => node.type === ASSET_TYPES.GROUP, [node.type])
  const getCacheKey = useCallback(() => `${node.id}-${selectedCurrency}`, [node.id, selectedCurrency])

  // **核心优化：更新市值的函数**
  const updateConvertedTotalValue = useCallback(async () => {
    if (!shouldCalculateTotal) return
    
    // 清除可能存在的上一个更新定时器
    if (updateTimerRef.current) clearTimeout(updateTimerRef.current)

    try {
      const totalValue = await calculateConvertedTotalValue(node)
      
      // 只有当新旧值的差异大于一个阈值时才触发更新动画
      if (Math.abs(displayValue - totalValue) > 0.5) {
        // 如果当前没有值，直接设置，不播放动画
        if (displayValue === 0) {
          safeSetDisplayValue(totalValue)
        } else {
          // 执行淡入淡出动画流程
          setIsFading(true) // 1. 开始淡出
          
          updateTimerRef.current = setTimeout(() => {
            safeSetDisplayValue(totalValue) // 2. 在元素透明时更新值
            setIsFading(false)             // 3. 开始淡入，触发CSS transition
          }, FADE_DURATION) // 等待淡出动画完成
        }
        
        // 更新内存缓存和原始计算值
        const cacheKey = getCacheKey()
        valueCache.set(cacheKey, totalValue)
        setConvertedTotalValue(totalValue)
      } else if (displayValue === 0 && totalValue > 0) {
        // 如果之前没有值，现在有了，就直接显示，无需动画
        safeSetDisplayValue(totalValue)
      }
    } catch (error) {
      // 错误处理：尝试从缓存恢复
      const cachedValue = valueCache.get(getCacheKey())
      if (cachedValue && cachedValue > 0) {
        safeSetDisplayValue(cachedValue)
      }
    }
  }, [
    shouldCalculateTotal, 
    calculateConvertedTotalValue, 
    node, 
    displayValue, 
    safeSetDisplayValue, 
    getCacheKey, 
    valueCache
  ])
  
  // 初始化时加载持久化或缓存的值
  useEffect(() => {
    if (!shouldCalculateTotal || displayValue > 0) return;
    
    const persistedValue = getPersistedValue();
    if (persistedValue > 0) {
        safeSetDisplayValue(persistedValue);
        valueCache.set(getCacheKey(), persistedValue);
    }
  }, [shouldCalculateTotal, displayValue, getPersistedValue, safeSetDisplayValue, valueCache, getCacheKey])

  // 依赖项变化时触发计算（带防抖）
  useEffect(() => {
    if (!shouldCalculateTotal) return
    
    const timeoutId = setTimeout(() => {
      updateConvertedTotalValue()
    }, 200) // 防抖延迟
    
    return () => {
      clearTimeout(timeoutId)
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current)
      }
    }
  }, [selectedCurrency, node.children, updateConvertedTotalValue]) // 依赖 node.children 可以在子节点变化时重新计算

  const handleNodeClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const isCtrlClick = e.ctrlKey || e.metaKey
    onNodeSelect(node.id, isCtrlClick)
  }

  const [{ isDragging }, dragRef] = useDrag({
    type: 'asset',
    item: () => ({ node, originalParentId: parentId, selectedNodeIds: isSelected && selectedNodes.size > 1 ? Array.from(selectedNodes) : undefined }),
    canDrag: () => !!node.id,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  })

  const [{ isOver, canDrop }, dropRef] = useDrop({
    accept: 'asset',
    drop: (item: { node: AssetNode, originalParentId: string | null, selectedNodeIds?: string[] }, monitor) => {
      if (monitor.didDrop()) return { moved: false }
      
      if (!monitor.canDrop()) {
        return { moved: false }
      }
      
      onAssetMove(item.node, node, item.originalParentId)
      return { moved: true }
    },
    canDrop: (item: { node: AssetNode, originalParentId: string | null, selectedNodeIds?: string[] }) => {
      if (node.type !== ASSET_TYPES.GROUP) return false
      
      const draggedIds = item.selectedNodeIds || [item.node.id]
      if (draggedIds.includes(node.id)) return false
      if (item.originalParentId === node.id) return false
      
      const isDescendant = (parent: AssetNode, childIds: string[]): boolean => {
        if (!parent.children) return false
        return parent.children.some(c => childIds.includes(c.id) || isDescendant(c, childIds))
      }
      return !isDescendant(item.node, [node.id])
    },
    collect: (monitor) => ({ 
      isOver: monitor.isOver(), 
      canDrop: monitor.canDrop() 
    }),
  })

  const combinedRef = (el: HTMLDivElement | null) => {
    dragRef(el)
    dropRef(el)
  }

  const formatOriginalCurrency = useCallback((value: number, currency: string) => {
    return `${new Intl.NumberFormat('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)} ${currency}`
  }, [])

  const formatConvertedCurrency = useCallback((value: number) => {
    return `${new Intl.NumberFormat('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)} ${selectedCurrency}`
  }, [selectedCurrency])

  const getAssetTypeIcon = useMemo(() => {
    switch (node.type) {
      case ASSET_TYPES.GROUP: return isExpanded ? <FolderOpen className="w-4 h-4 text-blue-600" /> : <Folder className="w-4 h-4 text-blue-600" />
      case ASSET_TYPES.CASH: return <Banknote className="w-4 h-4 text-green-600" />
      case ASSET_TYPES.STOCK: return <TrendingUp className="w-4 h-4 text-blue-600" />
      case ASSET_TYPES.BOND: return <FileText className="w-4 h-4 text-purple-600" />
      case ASSET_TYPES.FUND: return <Target className="w-4 h-4 text-orange-600" />
      case ASSET_TYPES.CRYPTO: return <Bitcoin className="w-4 h-4 text-yellow-600" />
      case ASSET_TYPES.REAL_ESTATE: return <Home className="w-4 h-4 text-red-600" />
      case ASSET_TYPES.LONGPORT_IMPORT: return <Link className="w-4 h-4 text-indigo-600" />
      default: return <Package className="w-4 h-4 text-gray-600" />
    }
  }, [node.type, isExpanded])

  const getAssetTypeDisplayName = useMemo(() => {
    switch (node.type) {
      case ASSET_TYPES.GROUP: return '资产组'
      case ASSET_TYPES.CASH: return '现金'
      case ASSET_TYPES.STOCK: return '股票'
      case ASSET_TYPES.BOND: return '债券'
      case ASSET_TYPES.FUND: return '基金'
      case ASSET_TYPES.CRYPTO: return '加密货币'
      case ASSET_TYPES.REAL_ESTATE: return '房地产'
      case ASSET_TYPES.LONGPORT_IMPORT: return '长桥证券'
      default: return '其他'
    }
  }, [node.type])

  const [showCostTooltip, setShowCostTooltip] = useState(false)

  const profitLossBadge = useMemo(() => {
    if (typeof node.currentPrice !== 'number' || typeof node.cost !== 'number') return null
    
    // 如果成本小于等于0，显示特殊信息
    if (node.cost <= 0) {
      return (
        <Badge 
          variant="outline"
          className="text-xs bg-red-50 text-red-700 border-red-200 cursor-pointer transition-all duration-200"
          onMouseEnter={() => setShowCostTooltip(true)}
          onMouseLeave={() => setShowCostTooltip(false)}
        >
          {showCostTooltip ? `成本${formatConvertedCurrency(node.cost)}` : '摊薄成本小于0'}
        </Badge>
      )
    }
    
    const changePercent = ((node.currentPrice - node.cost) / node.cost) * 100
    const isPositive = changePercent > 0
    const isNegative = changePercent < 0
    
    return (
      <Badge 
        variant="outline"
        className={`text-xs cursor-pointer transition-all duration-200 ${
          isNegative ? 'bg-green-50 text-green-700 border-green-200' :
          isPositive ? 'bg-red-50 text-red-700 border-red-200' :
          'bg-gray-50 text-gray-700 border-gray-200'
        }`}
        onMouseEnter={() => setShowCostTooltip(true)}
        onMouseLeave={() => setShowCostTooltip(false)}
      >
        {showCostTooltip ? `成本${formatConvertedCurrency(node.cost)}` : `${changePercent.toFixed(1)}%`}
      </Badge>
    )
  }, [node.currentPrice, node.cost, showCostTooltip, formatConvertedCurrency])

  return (
    <div key={node.id} className="select-none">
      <ContextMenu>
        <ContextMenuTrigger>
          <div 
            ref={combinedRef}
            onClick={handleNodeClick}
            className={`group flex items-center py-2 px-2 rounded-md cursor-pointer transition-all duration-200 ${
              isDragging ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
            } ${
              isSelected ? 'bg-blue-100 border-2 border-blue-300' :
              isOver && canDrop ? 'bg-blue-200/50 border-2 border-blue-300 border-dashed' : 
              isOver && !canDrop ? 'bg-red-100/50 border-2 border-red-300 border-dashed' :
              'hover:bg-muted/50 border-2 border-transparent'
            }`}
            style={{ paddingLeft: `${level * 20 + 8}px` }}
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              {hasChildren || node.type === ASSET_TYPES.GROUP ? (
                <button 
                  onClick={(e) => { e.stopPropagation(); onToggleExpanded(node.id) }}
                  className="p-1 hover:bg-muted rounded flex-shrink-0"
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <div className="w-6 flex-shrink-0" />
              )}
              
              <div className="flex-shrink-0">{getAssetTypeIcon}</div>
              
              <span className="flex-1 truncate" title={node.name}>{node.name}</span>
              
              <div className="flex items-center space-x-2 flex-shrink-0">
                {isSelected && selectedNodes.size > 1 && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    {selectedNodes.size}项
                  </Badge>
                )}
                
                <Move className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 hidden sm:inline-flex">
                  {getAssetTypeDisplayName}
                </Badge>
                
                {/* 显示资产数量 */}
                {node.type !== ASSET_TYPES.GROUP && node.quantity && node.quantity > 0 && (
                  <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
                    数量: {new Intl.NumberFormat('zh-CN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }).format(node.quantity)}
                  </Badge>
                )}
                
                {node.type !== ASSET_TYPES.GROUP && node.value && node.value > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {formatOriginalCurrency(node.value, node.currency || 'CNY')}
                  </Badge>
                )}
                
                {/* **优化的市值Badge** */}
                {node.type === ASSET_TYPES.GROUP && shouldShowBadge && (
                  <Badge 
                    variant="outline" 
                    className={`asset-value-badge text-xs ${isFading ? 'fading' : ''}`}
                    style={{
                      minWidth: '70px',
                      justifyContent: 'flex-end',
                      fontVariantNumeric: 'tabular-nums', // 让数字等宽，防止抖动
                      verticalAlign: 'middle',
                    }}
                  >
                    {formatConvertedCurrency(displayValue)}
                  </Badge>
                )}
                
                {profitLossBadge}
              </div>
            </div>
          </div>
        </ContextMenuTrigger>
        <AssetContextMenu node={node} onContextMenu={onContextMenu} />
      </ContextMenu>

      {(hasChildren || node.type === ASSET_TYPES.GROUP) && isExpanded && (
        <div>
          {node.children?.map(child => 
            <AssetTreeNode 
              key={child.id} 
              node={child} 
              level={level + 1} 
              parentId={node.id}
              expandedNodes={expandedNodes}
              selectedNodes={selectedNodes}
              onToggleExpanded={onToggleExpanded}
              onNodeSelect={onNodeSelect}
              onContextMenu={onContextMenu}
              onAssetMove={onAssetMove}
              calculateConvertedValue={calculateConvertedValue}
              calculateConvertedTotalValue={calculateConvertedTotalValue}
            />
          )}
        </div>
      )}
      
      {isOver && canDrop && (
        <div 
          className="ml-4 py-1 px-2 text-xs text-muted-foreground bg-blue-50 border border-blue-200 border-dashed rounded"
          style={{ paddingLeft: `${(level + 1) * 20 + 8}px` }}
        >
          松开以移动到此资产组
        </div>
      )}
    </div>
  )
}

// --- 导出优化后的组件 ---
// 使用React.memo和自定义比较函数来避免不必要的重渲染
export const AssetTreeNode = memo(AssetTreeNodeInner, (prevProps, nextProps) => {
  // 检查基本props变化
  if (
    prevProps.level !== nextProps.level ||
    prevProps.parentId !== nextProps.parentId ||
    prevProps.expandedNodes !== nextProps.expandedNodes ||
    prevProps.selectedNodes !== nextProps.selectedNodes
  ) {
    return false;
  }
  
  // 检查node内容变化
  const prevNode = prevProps.node;
  const nextNode = nextProps.node;
  
  if (
    prevNode.id !== nextNode.id ||
    prevNode.name !== nextNode.name ||
    prevNode.type !== nextNode.type ||
    Math.abs((prevNode.value || 0) - (nextNode.value || 0)) > 0.5 ||
    prevNode.currency !== nextNode.currency ||
    Math.abs((prevNode.currentPrice || 0) - (nextNode.currentPrice || 0)) > 0.01 ||
    Math.abs((prevNode.cost || 0) - (nextNode.cost || 0)) > 0.01 ||
    (prevNode.children?.length || 0) !== (nextNode.children?.length || 0)
  ) {
    return false;
  }
  
  return true;
});