import { useEffect, useState } from "react"
import { Navigation } from "./components/Navigation"
import { HeroSection } from "./components/HeroSection"
import { SummaryCards } from "./components/SummaryCards"
import { DataTable } from "./components/DataTable"
import { CurrencyProvider } from "./contexts/CurrencyContext"
import { Toaster } from "./components/ui/sonner"

export default function App() {
  // 管理添加交易请求的状态
  const [addTransactionRequest, setAddTransactionRequest] = useState<{
    assetId: string
    assetName: string
  } | null>(null)

  // 处理从AssetTree发起的添加交易请求
  const handleAddTransactionRequest = (assetId: string, assetName: string) => {
    setAddTransactionRequest({ assetId, assetName })
  }

  // 清除添加交易请求
  const clearAddTransactionRequest = () => {
    setAddTransactionRequest(null)
  }

  // 添加全局错误处理
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // 静默处理AbortError，不显示错误
      if (event.reason && event.reason.name === 'AbortError') {
        event.preventDefault()
        return
      }
      
      // 静默处理网络错误，让具体组件处理
      if (event.reason && event.reason.message && event.reason.message.includes('fetch')) {
        event.preventDefault()
        return
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return (
    <CurrencyProvider>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-6 py-8 space-y-8">
          <HeroSection onAddTransactionRequest={handleAddTransactionRequest} />
          {/* <SummaryCards /> */}
          <DataTable 
            addTransactionRequest={addTransactionRequest}
            onClearAddTransactionRequest={clearAddTransactionRequest}
          />
        </main>
        <Toaster />
      </div>
    </CurrencyProvider>
  )
}