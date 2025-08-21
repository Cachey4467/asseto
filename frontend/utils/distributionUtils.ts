import { AssetNode } from "./assetUtils"
import { ASSET_TYPES } from "./assetTypes"
import { CurrencyCode } from "../contexts/CurrencyContext"

// 递归计算节点汇总价值（叶子节点进行货币转换用于汇总计算）
export const calculateConvertedNodeTotalValue = async (
  node: any,
  convertCurrency: (amount: number, from: CurrencyCode, to: CurrencyCode) => Promise<number>,
  selectedCurrency: CurrencyCode
): Promise<number> => {
  let total = 0
  
  // 如果是叶子节点且有价值，转换货币用于汇总计算
  if (node.value && node.value > 0 && (!node.children || node.children.length === 0)) {
    const assetCurrency = (node.currency || 'CNY') as CurrencyCode
    const convertedValue = await convertCurrency(node.value, assetCurrency, selectedCurrency)
    total += convertedValue
  }
  
  // 递归处理子节点
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      const childValue = await calculateConvertedNodeTotalValue(child, convertCurrency, selectedCurrency)
      total += childValue
    }
  }
  
  return total
}

// 根据ID查找节点
export const findNodeById = (nodeId: string, searchNodes: AssetNode[] = []): AssetNode | null => {
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
}

// 计算参与分布的节点
export const getDistributionNodes = (
  selectedNodes: Set<string>,
  availableAssets: AssetNode[]
): AssetNode[] => {
  // 如果没有选择任何项，使用全部资产
  if (selectedNodes.size === 0) {
    return availableAssets
  }
  
  // 如果只选择了1项且是资产组，使用该资产组的子项
  if (selectedNodes.size === 1) {
    const selectedId = Array.from(selectedNodes)[0]
    const selectedNode = findNodeById(selectedId, availableAssets)
    
    if (selectedNode && selectedNode.type === ASSET_TYPES.GROUP && selectedNode.children) {
      return selectedNode.children
    }
  }
  
  // 其他情况：使用选中的项
  const selectedNodesList: AssetNode[] = []
  selectedNodes.forEach(nodeId => {
    const node = findNodeById(nodeId, availableAssets)
    if (node) {
      selectedNodesList.push(node)
    }
  })
  
  return selectedNodesList
}