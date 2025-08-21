export interface DistributionData {
  name: string
  value: number
  currency: string
  color: string
  percentage: number
}

export interface AssetDistributionProps {
  selectedNodes?: Set<string>
}