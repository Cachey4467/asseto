import { Asset, generateUniqueSymbol } from "../services/api"

export interface AssetNode {
  id: string
  name: string
  type: string
  description?: string
  quantity?: number
  cost?: number
  currency?: string
  value?: number
  currentPrice?: number
  children?: AssetNode[]
  symbol?: string
}

// 构建资产树结构 - 现在直接使用assets中的price字段
export function buildAssetTree(assets: Asset[]): AssetNode[] {

  // 将资产按层级分组
  const rootAssets: Asset[] = []
  const childAssets: { [parentId: string]: Asset[] } = {}

  assets.forEach(asset => {
    if (!asset.belong_id) {
      rootAssets.push(asset)
    } else {
      if (!childAssets[asset.belong_id]) {
        childAssets[asset.belong_id] = []
      }
      childAssets[asset.belong_id].push(asset)
    }
  })

  // 递归构建节点
  const buildNode = (asset: Asset): AssetNode => {
    const currentPrice = asset.price  // 直接使用asset.price字段
    
    // 直接使用asset.type，不进行转换
    const isGroup = asset.type === 'group'
    
    const node: AssetNode = {
      id: asset.id,
      name: asset.description,
      type: asset.type,  // 直接赋值asset.type
      description: asset.description,
      symbol: asset.symbol
    }

    if (!isGroup) {
      // 实际资产的属性
      node.quantity = asset.quantity
      node.cost = asset.remain_cost
      node.currency = asset.currency
      node.value = currentPrice ? asset.quantity * currentPrice : asset.quantity * asset.remain_cost
      
      if (currentPrice) {
        node.currentPrice = currentPrice
      }
    }

    // 递归添加子节点
    const children = childAssets[asset.id]
    if (children && children.length > 0) {
      node.children = children.map(buildNode)
      
      // 对子节点按照type和总价值进行两级排序
      node.children.sort((a, b) => {
        // 第一级排序：按type分类，group类型优先
        const typeA = a.type
        const typeB = b.type
        
        if (typeA === 'group' && typeB !== 'group') {
          return -1  // group类型排在前面
        }
        if (typeA !== 'group' && typeB === 'group') {
          return 1   // group类型排在前面
        }
        
        // 第二级排序：在相同type内按总价值降序排列
        const valueA = calculateNodeTotalValue(a)
        const valueB = calculateNodeTotalValue(b)
        return valueB - valueA  // 降序排列
      })
      
      // 子节点排序完成，无需日志
    }

    return node
  }

  // 构建根节点并按总价值排序
  const rootNodes = rootAssets.map(buildNode)
  
  // 对根级节点按照type和总价值进行两级排序
  rootNodes.sort((a, b) => {
    // 第一级排序：按type分类，group类型优先
    const typeA = a.type
    const typeB = b.type
    
    if (typeA === 'group' && typeB !== 'group') {
      return -1  // group类型排在前面
    }
    if (typeA !== 'group' && typeB === 'group') {
      return 1   // group类型排在前面
    }
    
    // 第二级排序：在相同type内按总价值降序排列
    const valueA = calculateNodeTotalValue(a)
    const valueB = calculateNodeTotalValue(b)
    return valueB - valueA  // 降序排列
  })
  
  return rootNodes
}

// 在树中查找节点
export function findNodeInTree(tree: AssetNode[], nodeId: string): AssetNode | null {
  for (const node of tree) {
    if (node.id === nodeId) {
      return node
    }
    if (node.children) {
      const found = findNodeInTree(node.children, nodeId)
      if (found) return found
    }
  }
  return null
}

// 生成唯一的资产symbol
export { generateUniqueSymbol }

// 生成资产组专用的symbol
export const generateGroupSymbol = (name: string): string => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 5)
  const prefix = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substr(0, 3)
  return `GROUP_${prefix}_${timestamp}_${random}`
}

// 计算节点的总价值（包括子节点）
export const calculateNodeTotalValue = (node: AssetNode): number => {
  let total = 0
  
  // 如果不是group节点且有价值，加入总计
  if (node.type !== 'group' && node.value) {
    total += node.value
  }
  
  // 递归计算子节点
  if (node.children) {
    node.children.forEach(child => {
      total += calculateNodeTotalValue(child)
    })
  }
  
  return total
}

// 验证资产数据 - 更新单位成本验证
export const validateAssetData = (data: {
  name: string
  quantity?: string
  cost?: string
  purchaseDate?: Date | undefined
  isGroup: boolean
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  if (!data.name.trim()) {
    errors.push('资产名称不能为空')
  }
  
  if (!data.isGroup) {
    // 对于实际资产，验证必选字段
    if (!data.quantity || parseFloat(data.quantity) <= 0) {
      errors.push('资产数量必须大于0')
    }
    
    if (!data.cost || parseFloat(data.cost) <= 0) {
      errors.push('单位成本（单价）必须大于0')
    }
    
    if (!data.purchaseDate) {
      errors.push('买入时间为必选项，请选择日期')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// 创建资产组数据 - 使用新的group类型
export const createAssetGroupData = (
  description: string,
  belongId: string,
  userId: string
): Omit<Asset, 'id'> => {
  return {
    type: 'group',  // 使用group类型
    belong_id: belongId,
    description,
    quantity: 0,
    remain_cost: 0,
    currency: 'CNY',
    symbol: generateGroupSymbol(description),
    userId
  }
}

// 创建资产数据 - 修正成本计算逻辑
export const createAssetData = (
  description: string,
  quantity: number,
  inputCost: number,  // 用户输入的成本值
  currency: string,
  belongId: string,
  userId: string
): Omit<Asset, 'id'> => {
  return {
    type: 'asset',  // 实际资产使用asset类型
    belong_id: belongId,
    description,
    quantity,
    remain_cost: inputCost,  // 直接使用用户输入的成本值，不乘以数量
    currency,
    symbol: generateUniqueSymbol(description),
    userId
  }
}

// 检查是否为资产组 - 基于type字段
export const isAssetGroup = (asset: Asset): boolean => {
  return asset.type === 'group'
}