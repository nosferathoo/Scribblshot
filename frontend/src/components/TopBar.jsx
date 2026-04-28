import {
  Undo2,
  Redo2,
  Download,
  Upload,
  Trash2,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

export default function TopBar({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSave,
  onLoad,
  onClear,
  onDeleteSelected,
  onBringForward,
  onSendBackward,
  hasSelection,
  zoomPct,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-50 flex flex-col sm:flex-row sm:justify-between items-stretch sm:items-start gap-2 pointer-events-none float-in-top">
        {/* Left: brand + file actions */}
        <div className="pointer-events-auto flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-2xl bg-white/90 backdrop-blur-xl border border-black/10 shadow-sm max-w-full overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 pr-1 sm:pr-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[#0A0A0A] grid place-items-center text-white text-sm font-semibold">
              S
            </div>
            <div className="leading-tight pr-1 hidden sm:block">
              <div className="text-sm font-semibold tracking-tight">
                Scribe Board
              </div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-500">
                Infinite canvas · PWA
              </div>
            </div>
          </div>

          <div className="w-px h-7 bg-black/10" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="btn-undo"
                onClick={onUndo}
                disabled={!canUndo}
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
              >
                <Undo2 size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Undo (⌘Z)
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="btn-redo"
                onClick={onRedo}
                disabled={!canRedo}
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
              >
                <Redo2 size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Redo (⌘⇧Z)
            </TooltipContent>
          </Tooltip>

          <div className="w-px h-7 bg-black/10" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="btn-save"
                onClick={onSave}
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
              >
                <Download size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Save board (.json)
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="btn-load"
                onClick={onLoad}
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
              >
                <Upload size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Load board (.json)
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="btn-clear"
                onClick={onClear}
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Clear board
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Right: selection actions + zoom */}
        <div className="pointer-events-auto flex flex-wrap justify-start sm:justify-end items-center gap-2 max-w-full">
          {hasSelection && (
            <div
              data-testid="selection-actions"
              className="flex items-center gap-1 px-2 py-1.5 sm:py-2 rounded-2xl bg-white/90 backdrop-blur-xl border border-black/10 shadow-sm"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    data-testid="btn-bring-forward"
                    onClick={onBringForward}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                  >
                    <Layers size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Bring forward
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    data-testid="btn-send-backward"
                    onClick={onSendBackward}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                  >
                    <Layers size={16} className="rotate-180" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Send backward
                </TooltipContent>
              </Tooltip>

              <div className="w-px h-7 bg-black/10" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    data-testid="btn-delete-selected"
                    onClick={onDeleteSelected}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Delete (Del)
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          <div className="flex items-center gap-1 px-2 py-1.5 sm:py-2 rounded-2xl bg-white/90 backdrop-blur-xl border border-black/10 shadow-sm">
            <Button
              data-testid="btn-zoom-out"
              onClick={onZoomOut}
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full"
            >
              <ZoomOut size={16} />
            </Button>
            <button
              data-testid="zoom-display"
              onClick={onZoomReset}
              className="px-1.5 sm:px-2 min-w-[44px] sm:min-w-[56px] text-xs font-medium tabular-nums hover:bg-black/5 rounded-md py-1.5"
            >
              {zoomPct}%
            </button>
            <Button
              data-testid="btn-zoom-in"
              onClick={onZoomIn}
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full"
            >
              <ZoomIn size={16} />
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  data-testid="btn-zoom-reset"
                  onClick={onZoomReset}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hidden sm:inline-flex"
                >
                  <Maximize2 size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Reset view
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
