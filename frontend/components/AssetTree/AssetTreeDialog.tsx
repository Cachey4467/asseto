import * as React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Alert, AlertDescription } from "../ui/alert"
import { FolderPlus, RefreshCw, Plus, Banknote, TrendingUp, FileText, Target, Bitcoin, Home, Package, Link, Edit } from "lucide-react"
import { AssetFormFields } from "./AssetFormFields"
import { AssetNode } from "../../utils/assetUtils"
import { ASSET_TYPES, getAddableAssetTypes, getAssetTypeConfig, AssetType } from "../../utils/assetTypes"

interface AssetTreeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dialogType: 'add' | 'addGroup' | 'addRootGroup' | 'edit'
  selectedNode: AssetNode | null
  onSubmit: (dialogType: string, formData: any, assetType?: AssetType) => Promise<void>
  isSubmitting: boolean
}

export function AssetTreeDialog({ 
  open, 
  onOpenChange, 
  dialogType, 
  selectedNode, 
  onSubmit, 
  isSubmitting 
}: AssetTreeDialogProps) {
  const [formData, setFormData] = useState<Record<string, any>>({
    name: '',
    currency: 'CNY'
  })
  const [selectedAssetType, setSelectedAssetType] = useState<AssetType>(ASSET_TYPES.STOCK)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const resetForm = () => {
    if (dialogType === 'edit' && selectedNode) {
      // 编辑模式下，预填充现有数据
      setFormData({
        name: selectedNode.name || selectedNode.description || '',
        currency: 'CNY'
      })
    } else {
      setFormData({
        name: '',
        currency: 'CNY'
      })
    }
    setSelectedAssetType(ASSET_TYPES.STOCK)
    setValidationErrors({})
  }

  const handleClose = () => {
    onOpenChange(false)
    resetForm()
  }

  // 当对话框打开或选中节点变化时，重置表单
  useEffect(() => {
    if (open) {
      resetForm()
    }
  }, [open, selectedNode, dialogType])

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (dialogType === 'add') {
      const config = getAssetTypeConfig(selectedAssetType)
      
      // 验证必填字段
      config.requiredFields.forEach(field => {
        const value = formData[field]
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          switch (field) {
            case 'name':
              errors[field] = '资产名称不能为空'
              break
            case 'amount':
            case 'totalValue':
              errors[field] = '金额不能为空'
              break
            case 'quantity':
            case 'shares':
              errors[field] = '数量不能为空'
              break
            case 'cost':
              errors[field] = '价格不能为空'
              break
            case 'symbol':
              errors[field] = '代码/符号不能为空'
              break
            case 'fundCode':
              errors[field] = '基金代码不能为空'
              break
            case 'faceValue':
              errors[field] = '面值不能为空'
              break
            case 'interestRate':
              errors[field] = '利率不能为空'
              break
            case 'location':
              errors[field] = '位置不能为空'
              break
            case 'purchaseDate':
            case 'maturityDate':
              errors[field] = '日期不能为空'
              break
            case 'currency':
              errors[field] = '货币单位不能为空'
              break
            case 'LONGPORT_APP_KEY':
              errors[field] = 'APP KEY不能为空'
              break
            case 'LONGPORT_APP_SECRET':
              errors[field] = 'APP SECRET不能为空'
              break
            case 'LONGPORT_ACCESS_TOKEN':
              errors[field] = 'ACCESS TOKEN不能为空'
              break
            default:
              errors[field] = '该字段不能为空'
          }
        }
      })

      // 验证数值字段
      const numericFields = ['amount', 'totalValue', 'quantity', 'shares', 'cost', 'faceValue', 'interestRate', 'area']
      numericFields.forEach(field => {
        const value = formData[field]
        if (value && isNaN(parseFloat(value))) {
          errors[field] = '请输入有效数字'
        } else if (value && parseFloat(value) <= 0) {
          errors[field] = '数值必须大于0'
        }
      })
    } else {
      // 资产组验证或编辑验证
      if (!formData.name || formData.name.trim() === '') {
        errors.name = dialogType === 'edit' ? '资产名称不能为空' : '资产组名称不能为空'
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    try {
      await onSubmit(dialogType, formData, dialogType === 'add' ? selectedAssetType : undefined)
      handleClose()
    } catch (error) {
      // Error handling is done in parent component
      console.error('Submit error:', error)
    }
  }

  const getDialogTitle = () => {
    switch (dialogType) {
      case 'add':
        const config = getAssetTypeConfig(selectedAssetType)
        return (
          <div className="flex items-center gap-2">
            {getAssetTypeIcon(selectedAssetType)}
            添加{config.name}
          </div>
        )
      case 'addGroup':
        return (
          <div className="flex items-center gap-2">
            <FolderPlus className="w-4 h-4" />
            添加资产子组
          </div>
        )
      case 'addRootGroup':
        return (
          <div className="flex items-center gap-2">
            <FolderPlus className="w-4 h-4" />
            创建一级资产组
          </div>
        )
      case 'edit':
        return (
          <div className="flex items-center gap-2">
            <Edit className="w-4 h-4" />
            修改资产信息
          </div>
        )
      default:
        return '添加资产'
    }
  }

  const getDialogDescription = () => {
    switch (dialogType) {
      case 'add':
        if (selectedAssetType === ASSET_TYPES.LONGPORT_IMPORT) {
          return `配置长桥证券API以自动导入资产到 "${selectedNode?.name}"`
        }
        return `向资产组 "${selectedNode?.name}" 添加新的${getAssetTypeConfig(selectedAssetType).name}`
      case 'addGroup':
        return `在资产组 "${selectedNode?.name}" 下创建新的子组`
      case 'addRootGroup':
        return '创建一个新的顶级资产组'
      case 'edit':
        return `修改 "${selectedNode?.name}" 的基本信息`
      default:
        return ''
    }
  }

  const getAssetTypeIcon = (type: AssetType) => {
    switch (type) {
      case ASSET_TYPES.CASH: return <Banknote className="w-4 h-4" />
      case ASSET_TYPES.STOCK: return <TrendingUp className="w-4 h-4" />
      case ASSET_TYPES.BOND: return <FileText className="w-4 h-4" />
      case ASSET_TYPES.FUND: return <Target className="w-4 h-4" />
      case ASSET_TYPES.CRYPTO: return <Bitcoin className="w-4 h-4" />
      case ASSET_TYPES.REAL_ESTATE: return <Home className="w-4 h-4" />
      case ASSET_TYPES.OTHER: return <Package className="w-4 h-4" />
      case ASSET_TYPES.LONGPORT_IMPORT: return <Link className="w-4 h-4" />
      default: return <Plus className="w-4 h-4" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>

        {dialogType === 'add' ? (
          <div className="space-y-4">
            {/* 资产类型选择 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="assetType" className="text-right">
                资产类型 *
              </Label>
              <Select
                value={selectedAssetType}
                onValueChange={(value: AssetType) => {
                  setSelectedAssetType(value)
                  // 重置表单数据，保留通用字段
                  setFormData({
                    name: formData.name,
                    currency: formData.currency || 'CNY'
                  })
                  setValidationErrors({})
                }}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAddableAssetTypes().map((typeConfig) => (
                    <SelectItem key={typeConfig.id} value={typeConfig.id}>
                      <div className="flex items-center gap-2">
                        {getAssetTypeIcon(typeConfig.id)}
                        <span>{typeConfig.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {typeConfig.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 动态表单字段 */}
            <AssetFormFields
              assetType={selectedAssetType}
              formData={formData}
              setFormData={setFormData}
              errors={validationErrors}
            />
          </div>
        ) : (
          // 资产组表单或编辑表单
          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="groupName" className="text-right whitespace-nowrap min-w-20">
                {dialogType === 'edit' ? '资产名称 *' : '资产组名 *'}
              </Label>
              <Input
                id="groupName"
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="flex-1"
                placeholder={dialogType === 'edit' ? '请输入新的资产名称' : '请输入资产组名称，如：股票投资、基金投资等'}
              />
            </div>
            
            {validationErrors.name && (
              <div className="text-sm text-red-600">
                {validationErrors.name}
              </div>
            )}

            {/* 根据对话框类型显示不同的说明 */}
            {dialogType === 'edit' ? (
              <Alert className="border-amber-200 bg-amber-50">
                <Edit className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <div className="font-medium mb-1">编辑说明</div>
                  <div className="text-sm">
                    当前仅支持修改资产描述名称。修改后将立即生效并在资产树中显示。
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-blue-200 bg-blue-50">
                <FolderPlus className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <div className="font-medium mb-1">资产组说明</div>
                  <div className="text-sm">
                    资产组用于分类管理您的投资，在后端将存储为type='group'的特殊资产项目。
                    创建后可以在该组下添加具体的资产项目。
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                {dialogType === 'add' ? (
                  selectedAssetType === ASSET_TYPES.LONGPORT_IMPORT ? (
                    <>
                      <Link className="w-4 h-4 mr-2" />
                      配置导入
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      添加资产
                    </>
                  )
                ) : dialogType === 'edit' ? (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    保存修改
                  </>
                ) : (
                  <>
                    <FolderPlus className="w-4 h-4 mr-2" />
                    创建资产组
                  </>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}