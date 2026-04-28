# Scribe Board — PRD (live document)

## Original Problem Statement
Build app to scribe on a board with possibility to add/paste images, take device screenshot from selected screen and autopaste it into board. With possibility to pan and zoom. With function to scale, move, rotate and delete added scribbles, text and images. App should be able to save and load the board (JSON). App should be PWA app and installable.

## Architecture
- **Frontend**: React 19 + react-konva canvas engine + Tailwind + shadcn/ui (Outfit font, Swiss/high-contrast minimal aesthetic).
- **Storage**: idb-keyval (IndexedDB) for autosave; JSON file save/load via Blob download / file input.
- **PWA**: `public/manifest.json` + `public/sw.js` (cache-first for assets, network-first for navigation).
- **Backend**: Untouched template (FastAPI + Mongo). App is fully client-side; no auth, no API.

## User Personas
- Designer / engineer who wants a quick scratchpad whiteboard, installable on desktop or tablet, fully offline.

## Core Requirements (static)
- Free-form pen, highlighter, eraser
- Shapes: rectangle, circle/ellipse, arrow
- Text tool with inline editor
- Image insertion: upload, paste from clipboard, drag-drop, screen capture (`getDisplayMedia`)
- Pan & zoom (mouse wheel, trackpad, space-drag, Pan tool)
- Selection: move, scale, rotate, delete (Konva Transformer)
- Layer order: bring forward / send backward
- Undo / Redo (50-step history, ⌘Z / ⌘⇧Z)
- Save / Load board as JSON (with embedded base64 images)
- Auto-save to IndexedDB
- PWA installable, offline-capable

## What's Been Implemented (Feb 2026)
- Full whiteboard MVP with all tools above
- Floating top bar (brand, undo, redo, save, load, clear, zoom, layers, delete)
- Floating bottom toolbar with tool selection + color/stroke popover
- Inline canvas text editor positioned in screen-space
- Service worker + manifest + 192/512 PNG icons
- Keyboard shortcuts: V, H, P, M, E, R, O, A, T, Space (pan), Delete, ⌘Z/⌘⇧Z

## Backlog
- P1: Multi-select (rubber-band)
- P1: Text font / weight controls in style popover
- P1: Per-board library (multiple named boards in IndexedDB; sidebar)
- P2: SVG / PNG export
- P2: Sticky notes / colored fill shapes
- P2: Pinch-to-zoom on touch
- P2: Cloud sync via backend (Mongo) with optional auth

## Next Tasks
- Manual user testing — particularly screen capture flow on user's device
- Add SVG export if requested
- Add multi-board management UI if requested
