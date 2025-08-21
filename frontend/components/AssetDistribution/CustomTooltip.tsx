import * as React from "react"
interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  formatCurrency: (value: number) => string
  formatPercentage: (percentage: number) => string
}

export function CustomTooltip({ active, payload, formatCurrency, formatPercentage }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <div className="font-medium">{data.name}</div>
        <div className="text-sm text-muted-foreground">
          {formatCurrency(data.value)}
        </div>
        <div className="text-sm text-muted-foreground">
          占比: {formatPercentage(data.percentage)}
        </div>
      </div>
    )
  }
  return null
}