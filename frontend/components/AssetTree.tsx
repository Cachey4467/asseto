import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { useDrop, DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Folder, AlertCircle, Wifi, WifiOff, FolderPlus, Check, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "./ui/context-menu"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Alert, AlertDescription } from "./ui/alert"
import { toast } from "sonner"
import { apiService, CURRENT_USER_ID, testApiConnection } from "../services/api"
import { AssetNode, buildAssetTree, validateAssetData, createAssetData } from "../utils/assetUtils"
import { useCurrency, useDataRefresh, CurrencyCode } from "../contexts/CurrencyContext"
import { AssetTreeDialog } from "./AssetTree/AssetTreeDialog"
import { AssetTreeNode } from "./AssetTree/AssetTreeNode"
import { ASSET_TYPES, AssetType } from "../utils/assetTypes"

function AssetTreeInner({ 
  onSelectedNodesChange,
  onAddTransactionRequest 
}: { 
  onSelectedNodesChange?: (selectedNodes: Set<string>) => void
  onAddTransactionRequest?: (assetId: string, assetName: string) => void 
}) {
  const [assets, setAssets] = useState<AssetNode[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<'add' | 'addGroup' | 'addRootGroup' | 'edit'>('add')
  const [selectedNode, setSelectedNode] = useState<AssetNode | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  
  const { selectedCurrency, convertCurrency } = useCurrency()
  const { isInitialLoad, sharedData, forceRefreshAssetData } = useDataRefresh()

  // 键盘事件监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsMultiSelectMode(true)
      }
      // ESC键取消所有选择
      if (e.key === 'Escape') {
        setSelectedNodes(new Set())
      }
      // Ctrl+A 全选
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        selectAllNodes()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsMultiSelectMode(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // 递归收集所有节点ID
  const collectAllNodeIds = useCallback((nodes: AssetNode[]): string[] => {
    const ids: string[] = []
    const traverse = (nodeList: AssetNode[]) => {
      nodeList.forEach(node => {
        ids.push(node.id)
        if (node.children) {
          traverse(node.children)
        }
      })
    }
    traverse(nodes)
    return ids
  }, [])

  // 全选功能
  const selectAllNodes = useCallback(() => {
    const allIds = collectAllNodeIds(assets)
    const newSelected = new Set(allIds)
    setSelectedNodes(newSelected)
    
    // 通知父组件选中状态变化
    if (onSelectedNodesChange) {
      onSelectedNodesChange(newSelected)
    }
    
    toast.success(`已选择 ${allIds.length} 个项目`)
  }, [assets, collectAllNodeIds, onSelectedNodesChange])

  // 清空选择
  const clearSelection = useCallback(() => {
    const newSelected = new Set<string>()
    setSelectedNodes(newSelected)
    
    // 通知父组件选中状态变化
    if (onSelectedNodesChange) {
      onSelectedNodesChange(newSelected)
    }
  }, [onSelectedNodesChange])

  // 检查连接状态
  const checkConnection = async () => {
    const connected = await testApiConnection()
    setIsConnected(connected)
    return connected
  }

  // 加载资产数据
  const loadAssets = async () => {
    try {
      // 只在初次加载时显示loading状态
      if (isInitialLoad) {
        setLoading(true)
      }
      setError(null)
      
      // 优先使用共享数据避免重复API请求
      if (sharedData.assets && sharedData.assets.length >= 0) { // 允许空数组
        console.log('🌲 AssetTree: 使用共享数据构建资产树', {
          assetsCount: sharedData.assets.length,
          assets: sharedData.assets
        })
        
        try {
          // 直接从共享数据构建资产树，使用assets中的price字段
          const assetTree = buildAssetTree(sharedData.assets)
          console.log('🌲 AssetTree: 构建完成的资产树', {
            treeNodes: assetTree.length,
            tree: assetTree
          })
          
          setAssets(assetTree)
          setIsConnected(true)
          return
        } catch (error) {
          console.warn('🌲 AssetTree: 构建资产树失败', error)
          // 构建失败时设置空数组
          setAssets([])
          setIsConnected(true)
          return
        }
      } else {
        console.log('🌲 AssetTree: 共享数据不可用，尝试直接API调用', sharedData)
      }
      
      const connected = await checkConnection()
      
      if (!connected) {
        setAssets([])
        setExpandedNodes(new Set())
        setSelectedNodes(new Set())
        return
      }
      
      const assetsResponse = await apiService.getAssets(CURRENT_USER_ID)

      if (!assetsResponse.success) {
        throw new Error(assetsResponse.error || '获取资产数据失败')
      }

      const assetTree = buildAssetTree(assetsResponse.data || [])
      
      setAssets(assetTree)
      
      // 自动展开有子节点的根节点
      const expanded = new Set<string>()
      assetTree.forEach(node => {
        if (node.children && node.children.length > 0) {
          expanded.add(node.id)
        }
      })
      setExpandedNodes(expanded)
      
      // 清空之前的选择
      const newSelected = new Set<string>()
      setSelectedNodes(newSelected)
      
      // 通知父组件选中状态变化
      if (onSelectedNodesChange) {
        onSelectedNodesChange(newSelected)
      }
      
    } catch (error) {
      // 静默处理AbortError
      if (error && error.name === 'AbortError') {
        console.log('🌲 AssetTree: 请求被中断，保持现状')
        return
      }
      
      console.error('加载资产数据时出错:', error)
      setError(error instanceof Error ? error.message : '加载数据失败')
      setIsConnected(false)
      setAssets([])
    } finally {
      // 只在初次加载时才设置loading为false
      if (isInitialLoad) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    loadAssets()
  }, [selectedCurrency, isInitialLoad, sharedData.assets])

  const toggleExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  // 节点选择处理
  const handleNodeSelect = (nodeId: string, isCtrlClick: boolean = false) => {
    const newSelected = new Set(selectedNodes)
    
    if (isCtrlClick || isMultiSelectMode) {
      // 多选模式：切换选中状态
      if (newSelected.has(nodeId)) {
        newSelected.delete(nodeId)
      } else {
        newSelected.add(nodeId)
      }
    } else {
      // 单选模式：只选中当前项
      if (newSelected.has(nodeId) && newSelected.size === 1) {
        // 如果当前项已选中且是唯一选中项，则取消选择
        newSelected.clear()
      } else {
        newSelected.clear()
        newSelected.add(nodeId)
      }
    }
    
    setSelectedNodes(newSelected)
    
    // 通知父组件选中状态变化
    if (onSelectedNodesChange) {
      onSelectedNodesChange(newSelected)
    }
  }

  // 处理右键菜单操作
  const handleContextMenu = (action: string, node: AssetNode) => {
    setSelectedNode(node)
    
    if (action === 'delete') {
      handleDeleteAsset(node)
    } else if (action === 'add_group') {
      setDialogType('addGroup')
      setDialogOpen(true)
    } else if (action === 'add') {
      setDialogType('add')
      setDialogOpen(true)
    } else if (action === 'edit') {
      setDialogType('edit')
      setDialogOpen(true)
    } else if (action === 'add_transaction') {
      // 触发添加交易对话框，传递选中的资产节点
      if (onAddTransactionRequest) {
        onAddTransactionRequest(node.id, node.name)
      }
    }
  }

  const handleTitleContextMenu = () => {
    setSelectedNode(null)
    setDialogType('addRootGroup')
    setDialogOpen(true)
  }

  // 处理Dialog提交
  const handleDialogSubmit = async (dialogType: string, formData: any, assetType?: AssetType) => {
    if (!isConnected) {
      toast.error('请先连接到后端服务')
      return
    }

    try {
      setSubmitting(true)
      
      if (dialogType === 'add') {
        if (!selectedNode) {
          toast.error('请选择父级资产组')
          return
        }

        // 根据资产类型构造不同的数据
        let assetData
        switch (assetType) {
          case ASSET_TYPES.CASH:
            // 现金资产：金额作为数量，单价固定为1
            assetData = {
              type: assetType,
              belong_id: selectedNode.id,
              description: formData.name,
              quantity: parseFloat(formData.amount), // 金额作为数量
              remain_cost: 1, // 单价固定为1
              currency: formData.currency,
              symbol: `CASH_${Date.now()}`,
              userId: CURRENT_USER_ID
            }
            break
            
          case ASSET_TYPES.STOCK:
          case ASSET_TYPES.CRYPTO:
            assetData = createAssetData(
              formData.name,
              parseFloat(formData.quantity),
              parseFloat(formData.cost),
              formData.currency,
              selectedNode.id,
              CURRENT_USER_ID
            )
            assetData.type = assetType
            assetData.symbol = formData.symbol || assetData.symbol
            break
            
          case ASSET_TYPES.FUND:
            assetData = {
              type: assetType,
              belong_id: selectedNode.id,
              description: formData.name,
              quantity: parseFloat(formData.shares),
              remain_cost: parseFloat(formData.cost),
              currency: formData.currency,
              symbol: formData.fundCode,
              userId: CURRENT_USER_ID
            }
            break
            
          case ASSET_TYPES.BOND:
            assetData = {
              type: assetType,
              belong_id: selectedNode.id,
              description: formData.name,
              quantity: parseFloat(formData.quantity || '1'),
              remain_cost: parseFloat(formData.faceValue),
              currency: formData.currency,
              symbol: `BOND_${Date.now()}`,
              userId: CURRENT_USER_ID
            }
            break
            
          case ASSET_TYPES.REAL_ESTATE:
          case ASSET_TYPES.OTHER:
            assetData = {
              type: assetType,
              belong_id: selectedNode.id,
              description: formData.name,
              quantity: 1,
              remain_cost: parseFloat(formData.totalValue),
              currency: formData.currency,
              symbol: `${assetType.toUpperCase()}_${Date.now()}`,
              userId: CURRENT_USER_ID
            }
            break

          case ASSET_TYPES.LONGPORT_IMPORT:
            // 长桥证券导入配置
            const longportConfig = {
              userId: CURRENT_USER_ID,
              belong_id: selectedNode.id,
              LONGPORT_APP_KEY: formData.LONGPORT_APP_KEY,
              LONGPORT_APP_SECRET: formData.LONGPORT_APP_SECRET,
              LONGPORT_ACCESS_TOKEN: formData.LONGPORT_ACCESS_TOKEN
            }

            // 配置长桥证券API
            
            if (!apiService.addLongportConfig) {
              throw new Error('addLongportConfig 函数未找到，请检查 API 服务')
            }

            const response = await apiService.addLongportConfig(longportConfig)
            
            if (!response.success) {
              throw new Error(response.error || '长桥证券配置失败')
            }

            toast.success('长桥证券API配置成功，系统将自动导入资产')
            break
            
          default:
            throw new Error('不支持的资产类型')
        }

        // 如果不是长桥证券导入，则添加普通资产
        if (assetType !== ASSET_TYPES.LONGPORT_IMPORT) {
          const response = await apiService.addAsset(assetData)
          
          if (!response.success) {
            throw new Error(response.error || '添加资产失败')
          }

          toast.success('资产添加成功')
        }
      } else if (dialogType === 'edit') {
        // 编辑资产信息
        if (!selectedNode) {
          toast.error('未选择要编辑的资产')
          return
        }

        const response = await apiService.updateAsset({
          id: selectedNode.id,
          userId: CURRENT_USER_ID,
          description: formData.name
        })
        
        if (!response.success) {
          throw new Error(response.error || '更新资产信息失败')
        }

        toast.success('资产信息更新成功')
      } else {
        // 添加资产组
        const parentId = dialogType === 'addRootGroup' ? '' : selectedNode?.id || ''
        
        const response = await apiService.addAssetGroup({
          belong_id: parentId,
          description: formData.name,
          userId: CURRENT_USER_ID
        })
        
        if (!response.success) {
          throw new Error(response.error || '创建资产组失败')
        }

        toast.success(dialogType === 'addRootGroup' ? '一级资产组创建成功' : '资产子组创建成功')
      }
      
      // 先更新本地数据
      await loadAssets()
      
      // 然后强制刷新全局共享数据
      await forceRefreshAssetData()
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败')
      console.error('操作失败:', error)
      throw error // Re-throw to prevent dialog from closing
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteAsset = async (node: AssetNode) => {
    if (!node.id) {
      toast.error('无法删除该资产：缺少标识符')
      return
    }

    const assetTypeText = node.type === ASSET_TYPES.GROUP ? '资产组' : '资产'
    if (!confirm(`确定要删除${assetTypeText} "${node.name}" 吗？此操作不可撤销。`)) {
      return
    }

    if (!isConnected) {
      toast.error('请先连接到后端服务')
      return
    }

    try {
      const response = await apiService.deleteAsset(node.id, CURRENT_USER_ID)
      
      if (!response.success) {
        throw new Error(response.error || '删除失败')
      }

      toast.success(`${assetTypeText}删除成功`)
      
      // 先更新本地数据
      await loadAssets()
      
      // 然后强制刷新全局共享数据
      await forceRefreshAssetData()
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败')
      console.error('删除失败:', error)
    }
  }

  // 查找节点的当前父级ID
  const findNodeParentId = (nodeId: string, searchNodes: AssetNode[] = assets, parentId: string | null = null): string | null => {
    for (const node of searchNodes) {
      if (node.id === nodeId) {
        return parentId
      }
      if (node.children && node.children.length > 0) {
        const result = findNodeParentId(nodeId, node.children, node.id)
        if (result !== undefined) return result
      }
    }
    return null
  }

  // 根据ID查找节点
  const findNodeById = useCallback((nodeId: string, searchNodes: AssetNode[] = assets): AssetNode | null => {
    for (const node of searchNodes) {
      if (node.id === nodeId) {
        return node
      }
      if (node.children) {
        const found = findNodeById(nodeId, node.children)
        if (found) return found
      }
    }
    return null
  }, [assets])

  // 批量移动资产
  const handleBatchAssetMove = async (draggedNodeIds: string[], targetNode: AssetNode) => {
    if (!isConnected || draggedNodeIds.length === 0) return

    try {
      const movePromises = draggedNodeIds.map(async (nodeId) => {
        const response = await apiService.updateAsset({
          id: nodeId,
          userId: CURRENT_USER_ID,
          belong_id: targetNode.id
        })

        if (!response.success) {
          throw new Error(`移动资产 ${nodeId} 失败: ${response.error}`)
        }

        return response
      })

      await Promise.all(movePromises)

      toast.success(`已将 ${draggedNodeIds.length} 个项目移动到 "${targetNode.name}" 下`)
      
      // 先更新本地数据
      await loadAssets()
      
      // 然后强制刷新全局共享数据
      await forceRefreshAssetData()
      
      // 清空选择
      const newSelected = new Set<string>()
      setSelectedNodes(newSelected)
      
      // 通知父组件选中状态变化
      if (onSelectedNodesChange) {
        onSelectedNodesChange(newSelected)
      }
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '批量移动资产失败')
      console.error('批量移动资产失败:', error)
    }
  }

  // 处理资产拖拽移动（支持多选）
  const handleAssetMove = async (draggedNode: AssetNode, targetNode: AssetNode, originalParentId?: string | null) => {
    if (!draggedNode.id || !isConnected) return

    // 检查是否是多选拖拽
    if (selectedNodes.has(draggedNode.id) && selectedNodes.size > 1) {
      // 多选拖拽
      const draggedNodeIds = Array.from(selectedNodes)
      await handleBatchAssetMove(draggedNodeIds, targetNode)
      return
    }

    // 单个拖拽的原有逻辑
    const currentParentId = originalParentId !== undefined ? originalParentId : findNodeParentId(draggedNode.id)
    const targetParentId = targetNode.id

    if (currentParentId === targetParentId) {
      return
    }

    try {
      const response = await apiService.updateAsset({
        id: draggedNode.id,
        userId: CURRENT_USER_ID,
        belong_id: targetNode.id
      })

      if (!response.success) {
        throw new Error(response.error || '移动资产失败')
      }

      toast.success(`已将 "${draggedNode.name}" 移动到 "${targetNode.name}" 下`)
      
      // 先更新本地数据
      await loadAssets()
      
      // 然后强制刷新全局共享数据
      await forceRefreshAssetData()
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '移动资产失败')
      console.error('移动资产失败:', error)
    }
  }

  // 计算并转换节点汇总价值（叶子节点转换货币用于资产组汇总）
  const calculateConvertedTotalValue = useCallback(async (node: AssetNode): Promise<number> => {
    let total = 0
    
    // 叶子节点：转换货币用于汇总计算（界面显示仍为原始货币）
    if (node.type !== ASSET_TYPES.GROUP && node.value) {
      const assetCurrency = (node.currency || 'CNY') as CurrencyCode
      const convertedValue = await convertCurrency(node.value, assetCurrency, selectedCurrency)
      total += convertedValue
    }
    
    // 递归处理子节点
    if (node.children) {
      for (const child of node.children) {
        const childValue = await calculateConvertedTotalValue(child)
        total += childValue
      }
    }
    
    return total
  }, [convertCurrency, selectedCurrency])

  // 计算资产转换价值（现在实际用于组件传递，确保稳定性）
  const calculateConvertedValueStable = useCallback(async (node: AssetNode): Promise<number> => {
    if (node.type !== ASSET_TYPES.GROUP && node.value) {
      const assetCurrency = (node.currency || 'CNY') as CurrencyCode
      return await convertCurrency(node.value, assetCurrency, selectedCurrency)
    }
    return 0
  }, [convertCurrency, selectedCurrency])

  // 根级拖拽目标组件
  const RootDropTarget = ({ children }: { children: React.ReactNode }) => {
    const [{ isOver, canDrop }, dropRef] = useDrop({
      accept: 'asset',
      drop: (item: { node: AssetNode, originalParentId: string | null, selectedNodeIds?: string[] }, monitor) => {
        if (monitor.didDrop()) {
          return { moved: false }
        }
        
        if (!monitor.canDrop()) {
          return { moved: false }
        }
        
        if (!monitor.isOver({ shallow: true })) {
          return { moved: false }
        }
        
        // 处理多选拖拽到根目录
        if (item.selectedNodeIds && item.selectedNodeIds.length > 1) {
          handleRootBatchMove(item.selectedNodeIds)
        } else if (item.originalParentId !== null) {
          handleRootMove(item.node, item.originalParentId)
        }
        
        return { moved: true }
      },
      canDrop: (item: { node: AssetNode, originalParentId: string | null, selectedNodeIds?: string[] }) => {
        if (item.selectedNodeIds && item.selectedNodeIds.length > 1) {
          // 多选拖拽：确保不是从根目录拖拽
          return item.selectedNodeIds.some(id => {
            const node = findNodeById(id)
            const parentId = node ? findNodeParentId(id) : null
            return parentId !== null
          })
        }
        if (!item.node.id) return false
        return item.originalParentId !== null
      },
      collect: (monitor) => ({
        isOver: monitor.isOver({ shallow: true }),
        canDrop: monitor.canDrop(),
      }),
    })

    const handleRootBatchMove = async (nodeIds: string[]) => {
      if (!isConnected) return

      try {
        const movePromises = nodeIds.map(async (nodeId) => {
          const response = await apiService.updateAsset({
            id: nodeId,
            userId: CURRENT_USER_ID,
            belong_id: '' // 空字符串表示根级别
          })

          if (!response.success) {
            throw new Error(`移动资产 ${nodeId} 失败: ${response.error}`)
          }

          return response
        })

        await Promise.all(movePromises)

        toast.success(`已将 ${nodeIds.length} 个项目移动到顶级目录`)
        
        // 先更新本地数据
        await loadAssets()
        
        // 然后强制刷新全局共享数据
        await forceRefreshAssetData()
        
        // 清空选择
        setSelectedNodes(new Set())
        
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '批量移动资产失败')
        console.error('批量移动资产失败:', error)
      }
    }

    const handleRootMove = async (node: AssetNode, originalParentId: string | null) => {
      if (!node.id || !isConnected) return

      try {
        const response = await apiService.updateAsset({
          id: node.id,
          userId: CURRENT_USER_ID,
          belong_id: '' // 空字符串表示根级别
        })

        if (!response.success) {
          throw new Error(response.error || '移动资产失败')
        }

        toast.success(`已将 "${node.name}" 移动到顶级目录`)
        
        // 先更新本地数据
        await loadAssets()
        
        // 然后强制刷新全局共享数据
        await forceRefreshAssetData()
        
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '移动资产失败')
        console.error('移动资产失败:', error)
      }
    }

    return (
      <div
        ref={dropRef}
        className={`relative transition-all duration-200 ${
          isOver && canDrop ? 'bg-blue-50/50' : ''
        }`}
      >
        {children}
        {isOver && canDrop && (
          <div className="absolute inset-0 border-2 border-blue-300 border-dashed rounded-lg bg-blue-50/80 flex items-center justify-center pointer-events-none">
            <div className="bg-white border border-blue-200 rounded-lg px-4 py-2 shadow-sm">
              <div className="flex items-center gap-2 text-blue-700">
                <Folder className="w-4 h-4" />
                <span className="text-sm font-medium">松开以移动到顶级目录</span>
              </div>
              <div className="text-xs text-blue-600 mt-1">将成为一级资产或资产组</div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <Card>
        <ContextMenu>
          <ContextMenuTrigger>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CardTitle className="font-bold">资产树</CardTitle>
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
                  
                  {/* 多选状态显示 */}
                  {selectedNodes.size > 0 && (
                    <Badge className="text-xs gap-1 bg-blue-100 text-blue-800 border-blue-200">
                      <Check className="w-3 h-3" />
                      已选择 {selectedNodes.size} 项
                    </Badge>
                  )}
                  
                  {isMultiSelectMode && (
                    <Badge className="text-xs gap-1 bg-yellow-100 text-yellow-800 border-yellow-200">
                      多选模式
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* 多选操作按钮 */}
                  {selectedNodes.size > 0 && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={clearSelection}
                        title="清空选择"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={selectAllNodes}
                        title="全选"
                      >
                        全选
                      </Button>
                    </>
                  )}
                  
                  {/* 移除手动刷新按钮，使用全局自动刷新 */}
                </div>
              </div>
            </CardHeader>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={handleTitleContextMenu}>
              <FolderPlus className="w-4 h-4 mr-2" />
              创建一级资产组
            </ContextMenuItem>
            <ContextMenuItem onClick={selectAllNodes}>
              <Check className="w-4 h-4 mr-2" />
              全选 (Ctrl+A)
            </ContextMenuItem>
            {selectedNodes.size > 0 && (
              <ContextMenuItem onClick={clearSelection}>
                <X className="w-4 h-4 mr-2" />
                清空选择 (ESC)
              </ContextMenuItem>
            )}
          </ContextMenuContent>
        </ContextMenu>
        <CardContent className={`transition-opacity duration-300 ${loading && isInitialLoad ? 'opacity-60' : 'opacity-100'}`}>
          <div className="space-y-1 min-h-32">
            {error ? (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            ) : assets.length > 0 ? (
              <RootDropTarget>
                <div className="space-y-1 min-h-16">
                  {assets.map(node => 
                    <AssetTreeNode 
                      key={node.id} 
                      node={node} 
                      level={0} 
                      parentId={null}
                      expandedNodes={expandedNodes}
                      selectedNodes={selectedNodes}
                      onToggleExpanded={toggleExpanded}
                      onNodeSelect={handleNodeSelect}
                      onContextMenu={handleContextMenu}
                      onAssetMove={handleAssetMove}
                      calculateConvertedValue={calculateConvertedValueStable}
                      calculateConvertedTotalValue={calculateConvertedTotalValue}
                    />
                  )}
                  <div className="min-h-16 w-full" />
                </div>
              </RootDropTarget>
            ) : (
              <RootDropTarget>
                <div className="text-center py-8 text-muted-foreground min-h-32">
                  <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>暂无资产数据</p>
                  <p className="text-sm">
                    {isConnected 
                      ? '右键点击标题创建资产组' 
                      : '请先连接到后端服务'
                    }
                  </p>
                </div>
              </RootDropTarget>
            )}
          </div>
        </CardContent>
      </Card>

      <AssetTreeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        dialogType={dialogType}
        selectedNode={selectedNode}
        onSubmit={handleDialogSubmit}
        isSubmitting={submitting}
      />
    </>
  )
}

// 导出包装了DndProvider的组件
export function AssetTree({ 
  onSelectedNodesChange,
  onAddTransactionRequest 
}: { 
  onSelectedNodesChange?: (selectedNodes: Set<string>) => void
  onAddTransactionRequest?: (assetId: string, assetName: string) => void 
}) {
  return (
    <DndProvider backend={HTML5Backend}>
      <AssetTreeInner 
        onSelectedNodesChange={onSelectedNodesChange}
        onAddTransactionRequest={onAddTransactionRequest}
      />
    </DndProvider>
  )
}