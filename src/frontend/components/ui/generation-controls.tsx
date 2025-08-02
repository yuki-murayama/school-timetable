import { Button } from "./button"
import { Wand2, Square } from "lucide-react"

interface GenerationControlsProps {
  onStart: () => void
  onStop: () => void
  isGenerating: boolean
}

export function GenerationControls({ onStart, onStop, isGenerating }: GenerationControlsProps) {
  return (
    <div className="controls flex justify-end space-x-4">
      <Button 
        onClick={onStart} 
        disabled={isGenerating}
        className="start-button"
        size="lg"
      >
        <Wand2 className="w-4 h-4 mr-2" />
        {isGenerating ? '生成中...' : '時間割生成開始'}
      </Button>

      {isGenerating && (
        <Button 
          onClick={onStop}
          className="stop-button"
          variant="outline"
          size="lg"
        >
          <Square className="w-4 h-4 mr-2" />
          生成停止
        </Button>
      )}
    </div>
  )
}