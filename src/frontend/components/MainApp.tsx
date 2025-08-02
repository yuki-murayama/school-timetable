import { useState, lazy, Suspense } from "react"
import { Sidebar } from "./Sidebar"

// Lazy load heavy components for code splitting
const TimetableGenerate = lazy(() => import("./TimetableGenerate").then(module => ({ default: module.TimetableGenerate })))
const DataManagementPage = lazy(() => import("../pages/DataManagementPage").then(module => ({ default: module.DataManagementPage })))
const TimetableView = lazy(() => import("./TimetableView").then(module => ({ default: module.TimetableView })))

interface MainAppProps {
  onLogout: () => void
}

export function MainApp({ onLogout }: MainAppProps) {
  const [currentPage, setCurrentPage] = useState("generate")

  const renderCurrentPage = () => {
    const LoadingSpinner = () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2">読み込み中...</span>
      </div>
    )

    return (
      <Suspense fallback={<LoadingSpinner />}>
        {(() => {
          switch (currentPage) {
            case "generate":
              return <TimetableGenerate />
            case "data":
              return <DataManagementPage />
            case "view":
              return <TimetableView />
            default:
              return <TimetableGenerate />
          }
        })()}
      </Suspense>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} onLogout={onLogout} />
      <main className="flex-1 overflow-auto">
        <div className="p-6">{renderCurrentPage()}</div>
      </main>
    </div>
  )
}