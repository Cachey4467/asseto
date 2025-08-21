import * as React from "react"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { DatePicker } from "../DatePicker"
import { Textarea } from "../ui/textarea"
import { Alert, AlertDescription } from "../ui/alert"
import { Info, Shield } from "lucide-react"
import { SUPPORTED_CURRENCIES } from "../../contexts/CurrencyContext"
import { AssetType, ASSET_TYPES, isRequiredField } from "../../utils/assetTypes"

interface AssetFormFieldsProps {
  assetType: AssetType
  formData: Record<string, any>
  setFormData: (updater: (prev: Record<string, any>) => Record<string, any>) => void
  errors?: Record<string, string>
}

export function AssetFormFields({ assetType, formData, setFormData, errors }: AssetFormFieldsProps) {
  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const renderField = (fieldName: string, component: React.ReactNode) => {
    const isRequired = isRequiredField(assetType, fieldName)
    const hasError = errors?.[fieldName]
    
    return (
      <div className="grid grid-cols-4 items-center gap-4">
        {component}
        {hasError && (
          <div className="col-span-4 text-sm text-red-600">
            {hasError}
          </div>
        )}
      </div>
    )
  }

  // 为长桥证券创建专门的垂直字段渲染函数
  const renderVerticalField = (fieldName: string, label: string, input: React.ReactNode) => {
    const hasError = errors?.[fieldName]
    
    return (
      <div className="space-y-2">
        <Label htmlFor={fieldName}>{label}</Label>
        {input}
        {hasError && (
          <div className="text-sm text-red-600">
            {hasError}
          </div>
        )}
      </div>
    )
  }

  // 通用字段
  const nameField = renderField('name', (
    <>
      <Label htmlFor="name" className="text-right">
        资产名称 *
      </Label>
      <Input
        id="name"
        value={formData.name || ''}
        onChange={(e) => updateField('name', e.target.value)}
        className="col-span-3"
        placeholder="请输入资产名称"
      />
    </>
  ))

  const descriptionField = renderField('description', (
    <>
      <Label htmlFor="description" className="text-right">
        描述
      </Label>
      <Textarea
        id="description"
        value={formData.description || ''}
        onChange={(e) => updateField('description', e.target.value)}
        className="col-span-3"
        placeholder="可选描述信息"
        rows={2}
      />
    </>
  ))

  const currencyField = renderField('currency', (
    <>
      <Label htmlFor="currency" className="text-right">
        货币单位 *
      </Label>
      <Select
        value={formData.currency || 'CNY'}
        onValueChange={(value) => updateField('currency', value)}
      >
        <SelectTrigger className="col-span-3">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.values(SUPPORTED_CURRENCIES).map((currency) => (
            <SelectItem key={currency.code} value={currency.code}>
              {currency.name} ({currency.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  ))

  const purchaseDateField = renderField('purchaseDate', (
    <>
      <Label htmlFor="purchaseDate" className="text-right">
        买入时间 *
      </Label>
      <div className="col-span-3">
        <DatePicker
          date={formData.purchaseDate}
          onDateChange={(date) => updateField('purchaseDate', date)}
          placeholder="请选择买入时间"
          className="w-full"
        />
      </div>
    </>
  ))

  // 根据资产类型渲染不同的字段
  switch (assetType) {
    case ASSET_TYPES.CASH:
      return (
        <div className="grid gap-4 py-4">
          {nameField}
          {renderField('amount', (
            <>
              <Label htmlFor="amount" className="text-right">
                金额 *
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount || ''}
                onChange={(e) => updateField('amount', e.target.value)}
                className="col-span-3"
                placeholder="请输入金额"
              />
            </>
          ))}
          {currencyField}
          {descriptionField}
        </div>
      )

    case ASSET_TYPES.STOCK:
      return (
        <div className="grid gap-4 py-4">
          {nameField}
          {renderField('symbol', (
            <>
              <Label htmlFor="symbol" className="text-right">
                股票代码 *
              </Label>
              <Input
                id="symbol"
                value={formData.symbol || ''}
                onChange={(e) => updateField('symbol', e.target.value.toUpperCase())}
                className="col-span-3"
                placeholder="如：AAPL, 000001"
              />
            </>
          ))}
          {renderField('quantity', (
            <>
              <Label htmlFor="quantity" className="text-right">
                股数 *
              </Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity || ''}
                onChange={(e) => updateField('quantity', e.target.value)}
                className="col-span-3"
                placeholder="请输入股数"
              />
            </>
          ))}
          {renderField('cost', (
            <>
              <Label htmlFor="cost" className="text-right">
                买入价格 *
              </Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={formData.cost || ''}
                onChange={(e) => updateField('cost', e.target.value)}
                className="col-span-3"
                placeholder="请输入每股买入价格"
              />
            </>
          ))}
          {currencyField}
          {purchaseDateField}
          {descriptionField}
        </div>
      )

    case ASSET_TYPES.BOND:
      return (
        <div className="grid gap-4 py-4">
          {nameField}
          {renderField('faceValue', (
            <>
              <Label htmlFor="faceValue" className="text-right">
                面值 *
              </Label>
              <Input
                id="faceValue"
                type="number"
                step="0.01"
                value={formData.faceValue || ''}
                onChange={(e) => updateField('faceValue', e.target.value)}
                className="col-span-3"
                placeholder="请输入债券面值"
              />
            </>
          ))}
          {renderField('interestRate', (
            <>
              <Label htmlFor="interestRate" className="text-right">
                利率 (%) *
              </Label>
              <Input
                id="interestRate"
                type="number"
                step="0.01"
                value={formData.interestRate || ''}
                onChange={(e) => updateField('interestRate', e.target.value)}
                className="col-span-3"
                placeholder="如：3.5"
              />
            </>
          ))}
          {renderField('quantity', (
            <>
              <Label htmlFor="quantity" className="text-right">
                数量
              </Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity || '1'}
                onChange={(e) => updateField('quantity', e.target.value)}
                className="col-span-3"
                placeholder="债券数量"
              />
            </>
          ))}
          {renderField('maturityDate', (
            <>
              <Label htmlFor="maturityDate" className="text-right">
                到期时间 *
              </Label>
              <div className="col-span-3">
                <DatePicker
                  date={formData.maturityDate}
                  onDateChange={(date) => updateField('maturityDate', date)}
                  placeholder="请选择到期时间"
                  className="w-full"
                />
              </div>
            </>
          ))}
          {currencyField}
          {purchaseDateField}
          {descriptionField}
        </div>
      )

    case ASSET_TYPES.FUND:
      return (
        <div className="grid gap-4 py-4">
          {nameField}
          {renderField('fundCode', (
            <>
              <Label htmlFor="fundCode" className="text-right">
                基金代码 *
              </Label>
              <Input
                id="fundCode"
                value={formData.fundCode || ''}
                onChange={(e) => updateField('fundCode', e.target.value)}
                className="col-span-3"
                placeholder="如：000001"
              />
            </>
          ))}
          {renderField('shares', (
            <>
              <Label htmlFor="shares" className="text-right">
                份额 *
              </Label>
              <Input
                id="shares"
                type="number"
                step="0.01"
                value={formData.shares || ''}
                onChange={(e) => updateField('shares', e.target.value)}
                className="col-span-3"
                placeholder="请输入基金份额"
              />
            </>
          ))}
          {renderField('cost', (
            <>
              <Label htmlFor="cost" className="text-right">
                买入净值 *
              </Label>
              <Input
                id="cost"
                type="number"
                step="0.0001"
                value={formData.cost || ''}
                onChange={(e) => updateField('cost', e.target.value)}
                className="col-span-3"
                placeholder="请输入买入时的净值"
              />
            </>
          ))}
          {currencyField}
          {purchaseDateField}
          {descriptionField}
        </div>
      )

    case ASSET_TYPES.CRYPTO:
      return (
        <div className="grid gap-4 py-4">
          {nameField}
          {renderField('symbol', (
            <>
              <Label htmlFor="symbol" className="text-right">
                代币符号 *
              </Label>
              <Input
                id="symbol"
                value={formData.symbol || ''}
                onChange={(e) => updateField('symbol', e.target.value.toUpperCase())}
                className="col-span-3"
                placeholder="如：BTC, ETH"
              />
            </>
          ))}
          {renderField('quantity', (
            <>
              <Label htmlFor="quantity" className="text-right">
                数量 *
              </Label>
              <Input
                id="quantity"
                type="number"
                step="0.00000001"
                value={formData.quantity || ''}
                onChange={(e) => updateField('quantity', e.target.value)}
                className="col-span-3"
                placeholder="请输入数量"
              />
            </>
          ))}
          {renderField('cost', (
            <>
              <Label htmlFor="cost" className="text-right">
                买入价格 *
              </Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={formData.cost || ''}
                onChange={(e) => updateField('cost', e.target.value)}
                className="col-span-3"
                placeholder="请输入买入价格"
              />
            </>
          ))}
          {currencyField}
          {purchaseDateField}
          {descriptionField}
        </div>
      )

    case ASSET_TYPES.REAL_ESTATE:
      return (
        <div className="grid gap-4 py-4">
          {nameField}
          {renderField('location', (
            <>
              <Label htmlFor="location" className="text-right">
                位置 *
              </Label>
              <Input
                id="location"
                value={formData.location || ''}
                onChange={(e) => updateField('location', e.target.value)}
                className="col-span-3"
                placeholder="如：北京市朝阳区"
              />
            </>
          ))}
          {renderField('area', (
            <>
              <Label htmlFor="area" className="text-right">
                面积 (㎡)
              </Label>
              <Input
                id="area"
                type="number"
                step="0.01"
                value={formData.area || ''}
                onChange={(e) => updateField('area', e.target.value)}
                className="col-span-3"
                placeholder="请输入面积"
              />
            </>
          ))}
          {renderField('totalValue', (
            <>
              <Label htmlFor="totalValue" className="text-right">
                总价值 *
              </Label>
              <Input
                id="totalValue"
                type="number"
                step="0.01"
                value={formData.totalValue || ''}
                onChange={(e) => updateField('totalValue', e.target.value)}
                className="col-span-3"
                placeholder="请输入总价值"
              />
            </>
          ))}
          {currencyField}
          {purchaseDateField}
          {descriptionField}
        </div>
      )

    case ASSET_TYPES.OTHER:
      return (
        <div className="grid gap-4 py-4">
          {nameField}
          {renderField('totalValue', (
            <>
              <Label htmlFor="totalValue" className="text-right">
                总价值 *
              </Label>
              <Input
                id="totalValue"
                type="number"
                step="0.01"
                value={formData.totalValue || ''}
                onChange={(e) => updateField('totalValue', e.target.value)}
                className="col-span-3"
                placeholder="请输入总价值"
              />
            </>
          ))}
          {currencyField}
          {renderField('purchaseDate', (
            <>
              <Label htmlFor="purchaseDate" className="text-right">
                获得时间
              </Label>
              <div className="col-span-3">
                <DatePicker
                  date={formData.purchaseDate}
                  onDateChange={(date) => updateField('purchaseDate', date)}
                  placeholder="请选择获得时间"
                  className="w-full"
                />
              </div>
            </>
          ))}
          {descriptionField}
        </div>
      )

    case ASSET_TYPES.LONGPORT_IMPORT:
      return (
        <div className="space-y-6 py-4">
          {/* API配置说明 */}
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="font-medium mb-1">长桥证券API配置</div>
              <div className="text-sm">
                配置长桥证券API密钥后，系统将自动同步您的持仓信息到当前资产组中。
                请确保API密钥具有查看持仓的权限。
              </div>
            </AlertDescription>
          </Alert>

          {/* API Key */}
          {renderVerticalField(
            'LONGPORT_APP_KEY',
            'APP KEY *',
            <Input
              id="LONGPORT_APP_KEY"
              type="password"
              value={formData.LONGPORT_APP_KEY || ''}
              onChange={(e) => updateField('LONGPORT_APP_KEY', e.target.value)}
              placeholder="请输入长桥证券APP KEY"
              className="w-full"
            />
          )}

          {/* API Secret */}
          {renderVerticalField(
            'LONGPORT_APP_SECRET',
            'APP SECRET *',
            <Input
              id="LONGPORT_APP_SECRET"
              type="password"
              value={formData.LONGPORT_APP_SECRET || ''}
              onChange={(e) => updateField('LONGPORT_APP_SECRET', e.target.value)}
              placeholder="请输入长桥证券APP SECRET"
              className="w-full"
            />
          )}

          {/* Access Token */}
          {renderVerticalField(
            'LONGPORT_ACCESS_TOKEN',
            'ACCESS TOKEN *',
            <Input
              id="LONGPORT_ACCESS_TOKEN"
              type="password"
              value={formData.LONGPORT_ACCESS_TOKEN || ''}
              onChange={(e) => updateField('LONGPORT_ACCESS_TOKEN', e.target.value)}
              placeholder="请输入长桥证券ACCESS TOKEN"
              className="w-full"
            />
          )}

          {/* 安全提示 */}
          <Alert className="border-amber-200 bg-amber-50">
            <Shield className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <div className="font-medium mb-1">安全提示</div>
              <div className="text-sm space-y-1">
                <div>• API密钥仅用于读取持仓信息，不会进行任何交易操作</div>
                <div>• 密钥信息将加密存储在后端服务器中</div>
                <div>• 建议定期更换API密钥以确保账户安全</div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )

    default:
      return null
  }
}