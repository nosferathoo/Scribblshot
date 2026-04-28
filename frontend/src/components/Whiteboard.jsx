import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Line,
  Rect,
  Ellipse,
  Arrow,
  Text as KText,
  Image as KImage,
  Transformer,
} from "react-konva";
import useImage from "use-image";
import { toast } from "sonner";
import Toolbar from "./Toolbar";
import TopBar from "./TopBar";
import { autosaveBoard, loadAutosave } from "../lib/storage";

// ---------- helpers ----------
const uid = () =>
  `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const MIN_SCALE = 0.1;
const MAX_SCALE = 8;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

async function captureDisplayFrame() {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: "monitor" },
  });
  const track = stream.getVideoTracks()[0];
  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  await video.play();
  await new Promise((r) => requestAnimationFrame(r));
  const w = video.videoWidth || 1920;
  const h = video.videoHeight || 1080;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d").drawImage(video, 0, 0, w, h);
  const dataUrl = c.toDataURL("image/png");
  track.stop();
  stream.getTracks().forEach((t) => t.stop());
  return { dataUrl, width: w, height: h };
}

function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function loadImageDims(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = rej;
    img.src = src;
  });
}

// ---------- Konva image wrapper ----------
function KonvaURLImage({ shape, ...rest }) {
  const [img] = useImage(shape.src, "anonymous");
  return (
    <KImage
      image={img}
      width={shape.width}
      height={shape.height}
      x={shape.x}
      y={shape.y}
      rotation={shape.rotation || 0}
      scaleX={shape.scaleX || 1}
      scaleY={shape.scaleY || 1}
      {...rest}
    />
  );
}

// ---------- Main component ----------
export default function Whiteboard() {
  const [shapes, setShapes] = useState([]);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#0A0A0A");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [selectedId, setSelectedId] = useState(null);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [size, setSize] = useState({
    w: window.innerWidth,
    h: window.innerHeight,
  });
  const [editingText, setEditingText] = useState(null); // { id, x, y, value, fontSize, color, isNew }
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [spaceDown, setSpaceDown] = useState(false);

  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const isDrawing = useRef(false);
  const drawingId = useRef(null);
  const fileInputRef = useRef(null);
  const loadInputRef = useRef(null);
  const lastShapesRef = useRef(shapes);
  lastShapesRef.current = shapes;

  // Resize
  useEffect(() => {
    const onResize = () =>
      setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Autosave / autoload
  useEffect(() => {
    (async () => {
      const data = await loadAutosave();
      if (data?.shapes) {
        setShapes(data.shapes);
        if (data.stagePos) setStagePos(data.stagePos);
        if (data.stageScale) setStageScale(data.stageScale);
      }
    })();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      autosaveBoard({ shapes, stagePos, stageScale }).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [shapes, stagePos, stageScale]);

  // History helpers
  const pushHistory = useCallback(() => {
    setPast((p) => [...p.slice(-49), lastShapesRef.current]);
    setFuture([]);
  }, []);

  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [lastShapesRef.current, ...f]);
      setShapes(prev);
      return p.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      setPast((p) => [...p, lastShapesRef.current]);
      setShapes(next);
      return f.slice(1);
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onDown = (e) => {
      if (editingText) return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (e.key === " ") {
        setSpaceDown(true);
        return;
      }
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      const map = {
        v: "select",
        h: "pan",
        p: "pen",
        m: "highlighter",
        e: "eraser",
        r: "rect",
        o: "circle",
        a: "arrow",
        t: "text",
      };
      const k = e.key.toLowerCase();
      if (map[k]) setTool(map[k]);
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          e.preventDefault();
          deleteSelected();
        }
      }
    };
    const onUp = (e) => {
      if (e.key === " ") setSpaceDown(false);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, editingText, undo, redo]);

  // Paste & drag-drop images
  useEffect(() => {
    const onPaste = async (e) => {
      const items = e.clipboardData?.items || [];
      for (const it of items) {
        if (it.type?.startsWith("image/")) {
          const file = it.getAsFile();
          if (file) {
            const dataUrl = await fileToDataURL(file);
            await addImageAtCenter(dataUrl);
            toast.success("Image pasted onto board");
            e.preventDefault();
            return;
          }
        }
      }
    };
    const onDrop = async (e) => {
      e.preventDefault();
      const files = e.dataTransfer?.files;
      if (!files?.length) return;
      for (const f of files) {
        if (f.type.startsWith("image/")) {
          const dataUrl = await fileToDataURL(f);
          await addImageAtCenter(dataUrl);
        }
      }
    };
    const onDragOver = (e) => e.preventDefault();
    window.addEventListener("paste", onPaste);
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragover", onDragOver);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragover", onDragOver);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageScale, stagePos, size]);

  // Attach transformer to selected node
  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;
    if (!selectedId) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }
    const node = stage.findOne(`#${selectedId}`);
    if (node) {
      tr.nodes([node]);
      tr.getLayer()?.batchDraw();
    } else {
      tr.nodes([]);
    }
  }, [selectedId, shapes]);

  // ---- Coord helpers ----
  const toWorld = (sx, sy) => ({
    x: (sx - stagePos.x) / stageScale,
    y: (sy - stagePos.y) / stageScale,
  });

  const center = () => toWorld(size.w / 2, size.h / 2);

  // ---- Add image ----
  const addImageAtCenter = async (dataUrl) => {
    const dims = await loadImageDims(dataUrl);
    const maxW = Math.min(800, size.w * 0.6);
    const ratio = dims.width > maxW ? maxW / dims.width : 1;
    const w = dims.width * ratio;
    const h = dims.height * ratio;
    const c = center();
    pushHistory();
    setShapes((s) => [
      ...s,
      {
        id: uid(),
        type: "image",
        x: c.x - w / 2,
        y: c.y - h / 2,
        width: w,
        height: h,
        src: dataUrl,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
    ]);
  };

  const handleUploadImageClick = () => fileInputRef.current?.click();
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataURL(file);
    await addImageAtCenter(dataUrl);
    e.target.value = "";
  };

  const handleCaptureScreen = async () => {
    try {
      const { dataUrl } = await captureDisplayFrame();
      await addImageAtCenter(dataUrl);
      toast.success("Screenshot added to the board");
    } catch (err) {
      if (err?.name === "NotAllowedError") {
        toast.error("Screen capture cancelled");
      } else {
        toast.error("Screen capture failed", {
          description: err?.message || String(err),
        });
      }
    }
  };

  // ---- Stage events ----
  const handleWheel = (e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const oldScale = stageScale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const isPinch = e.evt.ctrlKey;
    if (e.evt.ctrlKey || Math.abs(e.evt.deltaY) > 4) {
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const factor = isPinch ? 1.04 : 1.08;
      const newScale = clamp(
        direction > 0 ? oldScale * factor : oldScale / factor,
        MIN_SCALE,
        MAX_SCALE
      );
      const mousePointTo = {
        x: (pointer.x - stagePos.x) / oldScale,
        y: (pointer.y - stagePos.y) / oldScale,
      };
      setStageScale(newScale);
      setStagePos({
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
    } else {
      // Two-finger trackpad pan
      setStagePos((p) => ({ x: p.x - e.evt.deltaX, y: p.y - e.evt.deltaY }));
    }
  };

  const eraseAtPointer = () => {
    const stage = stageRef.current;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const node = stage.getIntersection(pos);
    if (!node) return;
    let id = node.id();
    if (!id) {
      const parent = node.findAncestor((n) => !!n.id());
      id = parent?.id();
    }
    if (id && id !== "background") {
      setShapes((s) => s.filter((sh) => sh.id !== id));
      if (selectedId === id) setSelectedId(null);
    }
  };

  const handleStageMouseDown = (e) => {
    const stage = stageRef.current;
    if (!stage) return;
    const isOnEmpty = e.target === stage || e.target.id?.() === "background";
    const pos = stage.getPointerPosition();
    const world = toWorld(pos.x, pos.y);

    // Pan tool / space-bar drag handled by stage.draggable
    if (tool === "pan" || spaceDown) return;

    if (tool === "select") {
      if (isOnEmpty) setSelectedId(null);
      return;
    }

    if (tool === "eraser") {
      isDrawing.current = true;
      pushHistory();
      eraseAtPointer();
      return;
    }

    if (tool === "text") {
      const id = uid();
      const fontSize = 24;
      setEditingText({
        id,
        worldX: world.x,
        worldY: world.y,
        value: "",
        fontSize,
        color,
        isNew: true,
      });
      return;
    }

    if (!isOnEmpty) return;

    isDrawing.current = true;
    const id = uid();
    drawingId.current = id;
    let newShape = null;

    if (tool === "pen") {
      newShape = {
        id,
        type: "line",
        kind: "pen",
        points: [world.x, world.y],
        stroke: color,
        strokeWidth,
        opacity: 1,
        tension: 0.4,
        lineCap: "round",
        lineJoin: "round",
      };
    } else if (tool === "highlighter") {
      newShape = {
        id,
        type: "line",
        kind: "highlighter",
        points: [world.x, world.y],
        stroke: color,
        strokeWidth: strokeWidth * 4,
        opacity: 0.35,
        tension: 0.2,
        lineCap: "round",
        lineJoin: "round",
      };
    } else if (tool === "rect") {
      newShape = {
        id,
        type: "rect",
        x: world.x,
        y: world.y,
        width: 1,
        height: 1,
        stroke: color,
        strokeWidth,
        fill: "transparent",
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      };
    } else if (tool === "circle") {
      newShape = {
        id,
        type: "ellipse",
        x: world.x,
        y: world.y,
        width: 1,
        height: 1,
        stroke: color,
        strokeWidth,
        fill: "transparent",
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      };
    } else if (tool === "arrow") {
      newShape = {
        id,
        type: "arrow",
        points: [world.x, world.y, world.x, world.y],
        stroke: color,
        strokeWidth,
        fill: color,
        pointerLength: 12,
        pointerWidth: 12,
      };
    }

    if (newShape) {
      pushHistory();
      setShapes((s) => [...s, newShape]);
    }
  };

  const handleStageMouseMove = () => {
    if (!isDrawing.current) return;
    const stage = stageRef.current;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const world = toWorld(pos.x, pos.y);

    if (tool === "eraser") {
      eraseAtPointer();
      return;
    }

    const id = drawingId.current;
    if (!id) return;

    setShapes((s) =>
      s.map((sh) => {
        if (sh.id !== id) return sh;
        if (sh.type === "line") {
          const last = sh.points;
          const lastX = last[last.length - 2];
          const lastY = last[last.length - 1];
          const dx = world.x - lastX;
          const dy = world.y - lastY;
          if (dx * dx + dy * dy < 1.5) return sh;
          return { ...sh, points: [...last, world.x, world.y] };
        }
        if (sh.type === "rect" || sh.type === "ellipse") {
          return { ...sh, width: world.x - sh.x, height: world.y - sh.y };
        }
        if (sh.type === "arrow") {
          const [x1, y1] = sh.points;
          return { ...sh, points: [x1, y1, world.x, world.y] };
        }
        return sh;
      })
    );
  };

  const handleStageMouseUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const id = drawingId.current;
    drawingId.current = null;
    // Normalise rect/ellipse with negative dims
    if (id) {
      setShapes((s) =>
        s.map((sh) => {
          if (sh.id !== id) return sh;
          if (sh.type === "rect" || sh.type === "ellipse") {
            let { x, y, width, height } = sh;
            if (width < 0) {
              x = x + width;
              width = -width;
            }
            if (height < 0) {
              y = y + height;
              height = -height;
            }
            if (Math.abs(width) < 2 && Math.abs(height) < 2) return null;
            return { ...sh, x, y, width, height };
          }
          if (sh.type === "line" && sh.points.length < 4) return null;
          return sh;
        }).filter(Boolean)
      );
    }
  };

  // ---- Shape interactions ----
  const onShapeClick = (e, id) => {
    if (tool !== "select") return;
    e.cancelBubble = true;
    setSelectedId(id);
  };

  const onShapeDragEnd = (e, id) => {
    const node = e.target;
    setShapes((s) =>
      s.map((sh) =>
        sh.id === id ? { ...sh, x: node.x(), y: node.y() } : sh
      )
    );
  };

  const onShapeTransformEnd = (e, id) => {
    const node = e.target;
    setShapes((s) =>
      s.map((sh) => {
        if (sh.id !== id) return sh;
        const rot = node.rotation();
        const sx = node.scaleX();
        const sy = node.scaleY();
        if (sh.type === "rect" || sh.type === "ellipse" || sh.type === "image") {
          const newW = Math.max(2, Math.abs(sh.width * sx));
          const newH = Math.max(2, Math.abs(sh.height * sy));
          node.scaleX(1);
          node.scaleY(1);
          return {
            ...sh,
            x: node.x(),
            y: node.y(),
            width: newW,
            height: newH,
            rotation: rot,
          };
        }
        if (sh.type === "text") {
          node.scaleX(1);
          node.scaleY(1);
          return {
            ...sh,
            x: node.x(),
            y: node.y(),
            fontSize: Math.max(6, sh.fontSize * Math.max(sx, sy)),
            rotation: rot,
          };
        }
        return {
          ...sh,
          x: node.x(),
          y: node.y(),
          rotation: rot,
          scaleX: sx,
          scaleY: sy,
        };
      })
    );
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    pushHistory();
    setShapes((s) => s.filter((sh) => sh.id !== selectedId));
    setSelectedId(null);
  };

  const bringForward = () => {
    if (!selectedId) return;
    setShapes((s) => {
      const i = s.findIndex((x) => x.id === selectedId);
      if (i < 0 || i === s.length - 1) return s;
      const copy = s.slice();
      [copy[i], copy[i + 1]] = [copy[i + 1], copy[i]];
      return copy;
    });
  };

  const sendBackward = () => {
    if (!selectedId) return;
    setShapes((s) => {
      const i = s.findIndex((x) => x.id === selectedId);
      if (i <= 0) return s;
      const copy = s.slice();
      [copy[i], copy[i - 1]] = [copy[i - 1], copy[i]];
      return copy;
    });
  };

  // ---- Save / Load JSON ----
  const handleSave = () => {
    const blob = new Blob(
      [JSON.stringify({ version: 1, shapes, stagePos, stageScale }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scribe-board-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Board saved");
  };

  const handleLoadClick = () => loadInputRef.current?.click();
  const handleLoadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data?.shapes) throw new Error("Invalid board file");
      pushHistory();
      setShapes(data.shapes);
      if (data.stagePos) setStagePos(data.stagePos);
      if (data.stageScale) setStageScale(data.stageScale);
      setSelectedId(null);
      toast.success("Board loaded");
    } catch (err) {
      toast.error("Failed to load board", { description: err.message });
    }
    e.target.value = "";
  };

  const handleClear = () => {
    if (!shapes.length) return;
    if (!window.confirm("Clear the entire board? This can be undone.")) return;
    pushHistory();
    setShapes([]);
    setSelectedId(null);
  };

  // ---- Zoom ----
  const zoomBy = (factor) => {
    const oldScale = stageScale;
    const cx = size.w / 2;
    const cy = size.h / 2;
    const newScale = clamp(oldScale * factor, MIN_SCALE, MAX_SCALE);
    const mousePointTo = {
      x: (cx - stagePos.x) / oldScale,
      y: (cy - stagePos.y) / oldScale,
    };
    setStageScale(newScale);
    setStagePos({
      x: cx - mousePointTo.x * newScale,
      y: cy - mousePointTo.y * newScale,
    });
  };

  const resetView = () => {
    setStageScale(1);
    setStagePos({ x: 0, y: 0 });
  };

  // ---- Inline text editing ----
  const finishEditingText = (commitValue) => {
    if (!editingText) return;
    const value = (commitValue ?? editingText.value).trim();
    if (editingText.isNew) {
      // Adding fresh text shape if non-empty
      if (value) {
        pushHistory();
        setShapes((s) => [
          ...s,
          {
            id: editingText.id,
            type: "text",
            x: editingText.worldX,
            y: editingText.worldY,
            text: value,
            fontSize: editingText.fontSize,
            fill: editingText.color,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
          },
        ]);
      }
    } else {
      // Updating existing text shape
      setShapes((s) => {
        if (!value) return s.filter((sh) => sh.id !== editingText.id);
        return s.map((sh) =>
          sh.id === editingText.id ? { ...sh, text: value } : sh
        );
      });
    }
    setEditingText(null);
  };

  const onTextDoubleClick = (e, sh) => {
    e.cancelBubble = true;
    setEditingText({
      id: sh.id,
      worldX: sh.x,
      worldY: sh.y,
      value: sh.text,
      fontSize: sh.fontSize,
      color: sh.fill,
      isNew: false,
    });
  };

  // Cursor class
  const cursorClass = useMemo(() => {
    if (spaceDown || tool === "pan") return "cursor-pan";
    if (tool === "eraser") return "cursor-eraser";
    if (
      tool === "pen" ||
      tool === "highlighter" ||
      tool === "rect" ||
      tool === "circle" ||
      tool === "arrow" ||
      tool === "text"
    )
      return "cursor-pen";
    return "";
  }, [tool, spaceDown]);

  const stageDraggable = tool === "pan" || spaceDown;

  // Editor screen-space position
  const editorScreen = editingText
    ? {
        x: stagePos.x + editingText.worldX * stageScale,
        y: stagePos.y + editingText.worldY * stageScale,
        fs: editingText.fontSize * stageScale,
      }
    : null;

  return (
    <div
      className={`relative h-screen w-screen overflow-hidden no-select ${cursorClass}`}
      data-testid="whiteboard-root"
    >
      {/* Dot grid background */}
      <div
        className="absolute inset-0 z-0 dot-grid"
        style={{
          "--grid-size": `${40 * stageScale}px`,
          "--grid-x": `${stagePos.x}px`,
          "--grid-y": `${stagePos.y}px`,
        }}
        data-testid="dot-grid"
      />

      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={stageScale}
        scaleY={stageScale}
        draggable={stageDraggable}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            setStagePos({ x: e.target.x(), y: e.target.y() });
          }
        }}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onTouchStart={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onTouchMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onTouchEnd={handleStageMouseUp}
        className="konva-stage absolute inset-0 z-10"
        data-testid="konva-stage"
      >
        <Layer>
          {shapes.map((sh) => {
            const common = {
              id: sh.id,
              draggable: tool === "select",
              onClick: (e) => onShapeClick(e, sh.id),
              onTap: (e) => onShapeClick(e, sh.id),
              onDragEnd: (e) => onShapeDragEnd(e, sh.id),
              onTransformEnd: (e) => onShapeTransformEnd(e, sh.id),
              listening: tool === "select" || tool === "eraser",
            };

            if (sh.type === "line") {
              return (
                <Line
                  key={sh.id}
                  {...common}
                  points={sh.points}
                  stroke={sh.stroke}
                  strokeWidth={sh.strokeWidth}
                  opacity={sh.opacity}
                  tension={sh.tension}
                  lineCap={sh.lineCap}
                  lineJoin={sh.lineJoin}
                  hitStrokeWidth={Math.max(sh.strokeWidth, 14)}
                  globalCompositeOperation={
                    sh.kind === "highlighter" ? "multiply" : "source-over"
                  }
                />
              );
            }
            if (sh.type === "rect") {
              return (
                <Rect
                  key={sh.id}
                  {...common}
                  x={sh.x}
                  y={sh.y}
                  width={sh.width}
                  height={sh.height}
                  stroke={sh.stroke}
                  strokeWidth={sh.strokeWidth}
                  fill={sh.fill}
                  rotation={sh.rotation || 0}
                  cornerRadius={4}
                />
              );
            }
            if (sh.type === "ellipse") {
              return (
                <Ellipse
                  key={sh.id}
                  {...common}
                  x={sh.x + sh.width / 2}
                  y={sh.y + sh.height / 2}
                  radiusX={Math.abs(sh.width) / 2}
                  radiusY={Math.abs(sh.height) / 2}
                  stroke={sh.stroke}
                  strokeWidth={sh.strokeWidth}
                  fill={sh.fill}
                  rotation={sh.rotation || 0}
                  // Override drag/transform position handling for ellipse so origin remains top-left semantics
                  onDragEnd={(e) => {
                    const node = e.target;
                    const newX = node.x() - sh.width / 2;
                    const newY = node.y() - sh.height / 2;
                    setShapes((s) =>
                      s.map((s2) =>
                        s2.id === sh.id ? { ...s2, x: newX, y: newY } : s2
                      )
                    );
                  }}
                  onTransformEnd={(e) => {
                    const node = e.target;
                    const sx = node.scaleX();
                    const sy = node.scaleY();
                    const rot = node.rotation();
                    const newW = Math.max(2, Math.abs(sh.width * sx));
                    const newH = Math.max(2, Math.abs(sh.height * sy));
                    node.scaleX(1);
                    node.scaleY(1);
                    setShapes((s) =>
                      s.map((s2) =>
                        s2.id === sh.id
                          ? {
                              ...s2,
                              x: node.x() - newW / 2,
                              y: node.y() - newH / 2,
                              width: newW,
                              height: newH,
                              rotation: rot,
                            }
                          : s2
                      )
                    );
                  }}
                />
              );
            }
            if (sh.type === "arrow") {
              return (
                <Arrow
                  key={sh.id}
                  {...common}
                  points={sh.points}
                  stroke={sh.stroke}
                  strokeWidth={sh.strokeWidth}
                  fill={sh.fill}
                  pointerLength={sh.pointerLength}
                  pointerWidth={sh.pointerWidth}
                  hitStrokeWidth={Math.max(sh.strokeWidth, 14)}
                />
              );
            }
            if (sh.type === "text") {
              return (
                <KText
                  key={sh.id}
                  {...common}
                  x={sh.x}
                  y={sh.y}
                  text={editingText?.id === sh.id ? "" : sh.text || ""}
                  fontSize={sh.fontSize}
                  fill={sh.fill}
                  fontFamily="Outfit, sans-serif"
                  rotation={sh.rotation || 0}
                  onDblClick={(e) => onTextDoubleClick(e, sh)}
                  onDblTap={(e) => onTextDoubleClick(e, sh)}
                />
              );
            }
            if (sh.type === "image") {
              return (
                <KonvaURLImage
                  key={sh.id}
                  shape={sh}
                  {...common}
                />
              );
            }
            return null;
          })}

          <Transformer
            ref={transformerRef}
            rotateEnabled
            keepRatio={false}
            anchorSize={10}
            anchorStroke="#0055FF"
            anchorFill="#FFFFFF"
            anchorCornerRadius={2}
            borderStroke="#0055FF"
            borderDash={[4, 3]}
            boundBoxFunc={(oldBox, newBox) => {
              if (Math.abs(newBox.width) < 8 || Math.abs(newBox.height) < 8)
                return oldBox;
              return newBox;
            }}
          />
        </Layer>
      </Stage>

      {/* Inline text editor overlay */}
      {editingText && editorScreen && (
        <textarea
          autoFocus
          ref={(el) => {
            if (el && !el.dataset.ready) {
              el.dataset.ready = "false";
              setTimeout(() => {
                el.dataset.ready = "true";
                el.focus();
              }, 60);
            }
          }}
          data-testid="text-editor"
          value={editingText.value}
          placeholder="Type…"
          onChange={(e) =>
            setEditingText((p) => ({ ...p, value: e.target.value }))
          }
          onBlur={(e) => {
            // Ignore initial blur right after opening (focus may have been intercepted by mouseup)
            if (e.currentTarget?.dataset?.ready !== "true") return;
            finishEditingText();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setEditingText(null);
            }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              finishEditingText();
            }
          }}
          className="canvas-text-editor"
          style={{
            left: editorScreen.x,
            top: editorScreen.y,
            fontSize: `${editorScreen.fs}px`,
            lineHeight: 1.15,
            color: editingText.color,
            minWidth: `${120 * stageScale}px`,
            minHeight: `${editorScreen.fs * 1.4}px`,
          }}
        />
      )}

      <TopBar
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        onUndo={undo}
        onRedo={redo}
        onSave={handleSave}
        onLoad={handleLoadClick}
        onClear={handleClear}
        onDeleteSelected={deleteSelected}
        onBringForward={bringForward}
        onSendBackward={sendBackward}
        hasSelection={!!selectedId}
        zoomPct={Math.round(stageScale * 100)}
        onZoomIn={() => zoomBy(1.2)}
        onZoomOut={() => zoomBy(1 / 1.2)}
        onZoomReset={resetView}
      />

      <Toolbar
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        onUploadImage={handleUploadImageClick}
        onCaptureScreen={handleCaptureScreen}
      />

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileChange}
        data-testid="image-file-input"
      />
      <input
        ref={loadInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleLoadFile}
        data-testid="board-load-input"
      />

      {/* Empty-state hint */}
      {shapes.length === 0 && !editingText && (
        <div
          data-testid="empty-hint"
          className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center"
        >
          <div className="text-center max-w-md px-6">
            <div className="text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-[#0A0A0A]">
              A canvas with no edges.
            </div>
            <p className="mt-4 text-sm text-neutral-500">
              Pick a tool below — sketch, drop images, paste from clipboard, or
              capture a screen. Pan with{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-black/5 text-[11px]">
                Space
              </kbd>
              , zoom with scroll.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
