import { AlertCircle } from "lucide-react"
import type { TimetableProgressData } from "../../lib/timetable-generator"

interface ProgressDisplayProps {
  progress: TimetableProgressData
  error?: string | null
}

export function ProgressDisplay({ progress, error }: ProgressDisplayProps) {
  return (
    <div className="progress-container space-y-4">
      <div className="progress-bar w-full bg-gray-200 rounded-full h-2">
        <div 
          className="progress-fill bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      <div className="progress-text text-center">
        <span className="text-lg font-medium">{progress.percentage}%</span>
        <span className="text-sm text-muted-foreground ml-2">
          ({progress.current}/{progress.total})
        </span>
      </div>

      <div className="current-step text-center">
        <p className="text-sm font-medium text-gray-700">
          {progress.currentStep}
        </p>
      </div>

      {error && (
        <div className="error-message bg-red-50 border border-red-200 rounded-md p-3 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-700">
            <p className="font-medium">処理中にエラーが発生しました:</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}