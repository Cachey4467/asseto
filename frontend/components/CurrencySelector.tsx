import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Button } from './ui/button'
import { RefreshCw } from 'lucide-react'
import { useCurrency, SUPPORTED_CURRENCIES, CurrencyCode } from '../contexts/CurrencyContext'
import { toast } from 'sonner'

interface CurrencySelectorProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showRefreshButton?: boolean
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({ 
  className = '', 
  size = 'md',
  showRefreshButton = false
}) => {
  const { 
    selectedCurrency, 
    setSelectedCurrency, 
    getCurrencyInfo, 
    refreshExchangeRates, 
    isLoadingRates 
  } = useCurrency()

  const handleCurrencyChange = (value: string) => {
    const newCurrency = value as CurrencyCode
    setSelectedCurrency(newCurrency)
    const currencyInfo = getCurrencyInfo(newCurrency)
    toast.success(`已切换到${currencyInfo.name} (${currencyInfo.code})`)
  }

  const handleRefreshRates = async () => {
    try {
      await refreshExchangeRates()
      toast.success('汇率已更新')
    } catch (error) {
      toast.error('汇率更新失败')
    }
  }

  const sizeClasses = {
    sm: 'h-8 text-sm',
    md: 'h-9 text-sm',
    lg: 'h-10 text-base'
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select value={selectedCurrency} onValueChange={handleCurrencyChange}>
        <SelectTrigger className={`w-28 ${sizeClasses[size]}`}>
          <SelectValue>
            <div className="flex items-center gap-1">
              <span className="font-medium">
                {getCurrencyInfo(selectedCurrency).symbol}
              </span>
              <span className="text-muted-foreground">
                {selectedCurrency}
              </span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.values(SUPPORTED_CURRENCIES).map((currency) => (
            <SelectItem key={currency.code} value={currency.code}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{currency.symbol}</span>
                  <span>{currency.code}</span>
                </div>
                <span className="text-muted-foreground text-sm">
                  {currency.name}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {showRefreshButton && (
        <Button
          variant="outline"
          size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'}
          onClick={handleRefreshRates}
          disabled={isLoadingRates}
          className="flex items-center gap-1"
        >
          <RefreshCw className={`${isLoadingRates ? 'animate-spin' : ''} ${
            size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
          }`} />
          {size !== 'sm' && '更新汇率'}
        </Button>
      )}
    </div>
  )
}