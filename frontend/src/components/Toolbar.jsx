import {
  MousePointer2,
  Hand,
  PenTool,
  Highlighter,
  Eraser,
  Square,
  Circle,
  ArrowUpRight,
  Type,
  ImageIcon,
  MonitorUp,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";

const TOOLS = [
  { id: "select", label: "Select", Icon: MousePointer2, hint: "V" },
  { id: "pan", label: "Pan", Icon: Hand, hint: "H / Space" },
  { id: "pen", label: "Pen", Icon: PenTool, hint: "P" },
  { id: "highlighter", label: "Highlighter", Icon: Highlighter, hint: "M" },
  { id: "eraser", label: "Eraser", Icon: Eraser, hint: "E" },
  { id: "rect", label: "Rectangle", Icon: Square, hint: "R" },
  { id: "circle", label: "Circle", Icon: Circle, hint: "O" },
  { id: "arrow", label: "Arrow", Icon: ArrowUpRight, hint: "A" },
  { id: "text", label: "Text", Icon: Type, hint: "T" },
];

const COLORS = [
  "#0A0A0A",
  "#737373",
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#0055FF",
  "#8B5CF6",
  "#EC4899",
];

export default function Toolbar({
  tool,
  setTool,
  color,
  setColor,
  strokeWidth,
  setStrokeWidth,
  onUploadImage,
  onCaptureScreen,
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <div
        data-testid="bottom-toolbar"
        className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-3 py-2 rounded-full bg-white/90 backdrop-blur-xl border border-black/10 shadow-[0_12px_40px_rgba(0,0,0,0.10)] float-in"
      >
        {TOOLS.map(({ id, label, Icon, hint }) => (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <button
                data-testid={`tool-${id}`}
                aria-label={label}
                onClick={() => setTool(id)}
                data-active={tool === id}
                className="tool-pill"
              >
                <Icon size={18} strokeWidth={1.75} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {label} <span className="opacity-60 ml-1">{hint}</span>
            </TooltipContent>
          </Tooltip>
        ))}

        <div className="w-px h-7 bg-black/10 mx-1" />

        {/* Image upload */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              data-testid="tool-image"
              aria-label="Upload image"
              onClick={onUploadImage}
              className="tool-pill"
            >
              <ImageIcon size={18} strokeWidth={1.75} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Upload image
          </TooltipContent>
        </Tooltip>

        {/* Screen capture */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              data-testid="tool-screen-capture"
              aria-label="Capture screen"
              onClick={onCaptureScreen}
              className="tool-pill"
            >
              <MonitorUp size={18} strokeWidth={1.75} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Capture screen
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-7 bg-black/10 mx-1" />

        {/* Color picker */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              data-testid="open-color-picker"
              aria-label="Color"
              className="tool-pill"
            >
              <span
                className="w-5 h-5 rounded-full border border-black/10"
                style={{ background: color }}
              />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="center"
            className="w-56 p-3"
            data-testid="color-picker-popover"
          >
            <div className="text-xs font-semibold tracking-wider uppercase text-neutral-500 mb-2">
              Color
            </div>
            <div className="grid grid-cols-8 gap-2 mb-3">
              {COLORS.map((c) => (
                <button
                  key={c}
                  data-testid={`color-${c.replace("#", "")}`}
                  onClick={() => setColor(c)}
                  data-active={color === c}
                  className="swatch"
                  style={{ background: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
            <div className="text-xs font-semibold tracking-wider uppercase text-neutral-500 mb-2 mt-3">
              Stroke — {strokeWidth}px
            </div>
            <Slider
              data-testid="stroke-slider"
              value={[strokeWidth]}
              min={1}
              max={32}
              step={1}
              onValueChange={(v) => setStrokeWidth(v[0])}
            />
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  );
}
