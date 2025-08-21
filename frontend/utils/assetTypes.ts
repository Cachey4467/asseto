// 资产类型定义
export const ASSET_TYPES = {
  GROUP: 'group',
  CASH: 'cash',
  STOCK: 'stock', 
  BOND: 'bond',
  FUND: 'fund',
  CRYPTO: 'crypto',
  REAL_ESTATE: 'real_estate',
  OTHER: 'other',
  LONGPORT_IMPORT: 'longport_import'
} as const

export type AssetType = typeof ASSET_TYPES[keyof typeof ASSET_TYPES]

// 资产类型配置
export interface AssetTypeConfig {
  id: AssetType
  name: string
  icon: string
  description: string
  requiredFields: string[]
  optionalFields: string[]
}

export const ASSET_TYPE_CONFIGS: Record<AssetType, AssetTypeConfig> = {
  [ASSET_TYPES.GROUP]: {
    id: ASSET_TYPES.GROUP,
    name: '资产组',
    icon: '📁',
    description: '用于分类管理其他资产',
    requiredFields: ['name'],
    optionalFields: []
  },
  [ASSET_TYPES.CASH]: {
    id: ASSET_TYPES.CASH,
    name: '现金',
    icon: '💵',
    description: '现金、储蓄账户等流动资产',
    requiredFields: ['name', 'amount', 'currency'],
    optionalFields: ['description']
  },
  [ASSET_TYPES.STOCK]: {
    id: ASSET_TYPES.STOCK,
    name: '股票',
    icon: '📈',
    description: '股票投资',
    requiredFields: ['name', 'symbol', 'quantity', 'cost', 'currency', 'purchaseDate'],
    optionalFields: ['description']
  },
  [ASSET_TYPES.BOND]: {
    id: ASSET_TYPES.BOND,
    name: '债券',
    icon: '📜',
    description: '债券投资',
    requiredFields: ['name', 'faceValue', 'interestRate', 'maturityDate', 'currency', 'purchaseDate'],
    optionalFields: ['description', 'quantity']
  },
  [ASSET_TYPES.FUND]: {
    id: ASSET_TYPES.FUND,
    name: '基金',
    icon: '🎯',
    description: '基金投资',
    requiredFields: ['name', 'fundCode', 'shares', 'cost', 'currency', 'purchaseDate'],
    optionalFields: ['description']
  },
  [ASSET_TYPES.CRYPTO]: {
    id: ASSET_TYPES.CRYPTO,
    name: '加密货币',
    icon: '₿',
    description: '加密货币投资',
    requiredFields: ['name', 'symbol', 'quantity', 'cost', 'currency', 'purchaseDate'],
    optionalFields: ['description']
  },
  [ASSET_TYPES.REAL_ESTATE]: {
    id: ASSET_TYPES.REAL_ESTATE,
    name: '房地产',
    icon: '🏠',
    description: '房地产投资',
    requiredFields: ['name', 'location', 'totalValue', 'currency', 'purchaseDate'],
    optionalFields: ['description', 'area']
  },
  [ASSET_TYPES.OTHER]: {
    id: ASSET_TYPES.OTHER,
    name: '其他',
    icon: '📦',
    description: '其他类型资产',
    requiredFields: ['name', 'totalValue', 'currency'],
    optionalFields: ['description', 'purchaseDate']
  },
  [ASSET_TYPES.LONGPORT_IMPORT]: {
    id: ASSET_TYPES.LONGPORT_IMPORT,
    name: '长桥证券导入',
    icon: '🔗',
    description: '连接长桥证券账户自动导入资产',
    requiredFields: ['LONGPORT_APP_KEY', 'LONGPORT_APP_SECRET', 'LONGPORT_ACCESS_TOKEN'],
    optionalFields: []
  }
}

// 获取资产类型配置
export const getAssetTypeConfig = (type: AssetType): AssetTypeConfig => {
  return ASSET_TYPE_CONFIGS[type] || ASSET_TYPE_CONFIGS[ASSET_TYPES.OTHER]
}

// 检查字段是否为必填
export const isRequiredField = (assetType: AssetType, fieldName: string): boolean => {
  const config = getAssetTypeConfig(assetType)
  return config.requiredFields.includes(fieldName)
}

// 检查字段是否适用于该资产类型
export const isApplicableField = (assetType: AssetType, fieldName: string): boolean => {
  const config = getAssetTypeConfig(assetType)
  return config.requiredFields.includes(fieldName) || config.optionalFields.includes(fieldName)
}

// 获取可添加的资产类型（排除group）
export const getAddableAssetTypes = (): AssetTypeConfig[] => {
  return Object.values(ASSET_TYPE_CONFIGS).filter(config => config.id !== ASSET_TYPES.GROUP)
}

// 右键菜单选项类型定义
export interface ContextMenuOption {
  id: string
  label: string
  icon: string
  danger?: boolean
}

export interface ContextMenuSeparator {
  id: 'separator'
}

export type ContextMenuItem = ContextMenuOption | ContextMenuSeparator

// 根据节点类型获取可用的右键菜单选项
export const getContextMenuOptions = (nodeType: AssetType): ContextMenuItem[] => {
  const options: ContextMenuItem[] = []
  
  if (nodeType === ASSET_TYPES.GROUP) {
    // 资产组右键菜单：添加资产、添加子组、修改信息、删除
    options.push(
      { id: 'add', label: '添加资产', icon: '➕' },
      { id: 'add_group', label: '添加资产子组', icon: '📁' },
      { id: 'separator' },
      { id: 'edit', label: '修改资产信息', icon: '✏️' },
      { id: 'separator' },
      { id: 'delete', label: '删除', icon: '🗑️', danger: true }
    )
  } else {
    // 普通资产右键菜单：添加交易、修改信息、删除
    options.push(
      { id: 'add_transaction', label: '添加交易', icon: '💰' },
      { id: 'separator' },
      { id: 'edit', label: '修改资产信息', icon: '✏️' },
      { id: 'separator' },
      { id: 'delete', label: '删除', icon: '🗑️', danger: true }
    )
  }
  
  return options
}