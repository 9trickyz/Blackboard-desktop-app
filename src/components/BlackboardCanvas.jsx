import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  drawPenStrokeToContext,
  drawShapeToContext,
  drawLineToContext,
  drawTextToContext,
  drawImageToContext
} from '../utils/exporter';
import { recognizeStroke } from '../utils/inkToShape';

// Helper to get element bounds
function getSingleElementBounds(el) {
  if (el.type === 'shape' || el.type === 'image') {
    return {
      minX: el.x,
      minY: el.y,
      maxX: el.x + el.width,
      maxY: el.y + el.height,
      width: el.width,
      height: el.height,
      centerX: el.x + el.width / 2,
      centerY: el.y + el.height / 2
    };
  }
  if (el.type === 'line') {
    const minX = Math.min(el.x1, el.x2);
    const minY = Math.min(el.y1, el.y2);
    const maxX = Math.max(el.x1, el.x2);
    const maxY = Math.max(el.y1, el.y2);
    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (el.x1 + el.x2) / 2,
      centerY: (el.y1 + el.y2) / 2
    };
  }
  if (el.type === 'text') {
    const lines = (el.text || '').split('\n');
    let maxLineLen = 0;
    lines.forEach(l => { if (l.length > maxLineLen) maxLineLen = l.length; });
    const approxW = Math.max(60, maxLineLen * (el.fontSize || 16) * 0.62);
    const lineCount = Math.max(1, lines.length);
    const h = (el.fontSize || 16) * 1.35 * lineCount;
    return {
      minX: el.x,
      minY: el.y - (el.fontSize || 16),
      maxX: el.x + approxW,
      maxY: el.y + h - (el.fontSize || 16),
      width: approxW,
      height: h,
      centerX: el.x + approxW / 2,
      centerY: el.y - (el.fontSize || 16) + h / 2
    };
  }
  if (el.type === 'pen' && el.points && el.points.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of el.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };
  }
  return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
}

// Bounding box for multiple elements
function getCombinedBounds(elements, selectedIds) {
  const selectedEls = elements.filter(el => selectedIds.includes(el.id));
  if (selectedEls.length === 0) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of selectedEls) {
    const b = getSingleElementBounds(el);
    if (b.minX < minX) minX = b.minX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.maxY > maxY) maxY = b.maxY;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2
  };
}

export default function BlackboardCanvas({
  elements,
  onChangeElements,
  onPushHistory,
  mode, // 'view' | 'edit'
  activeTool, // 'select' | 'pen' | 'shape' | 'text' | 'line' | 'image'
  currentShape,
  strokeColor,
  strokeWeight,
  transparency,
  textColor,
  fontSize,
  isBold,
  isItalic,
  isStrikethrough,
  pattern, // 'blank' | 'grid' | 'dotted'
  settings,
  zoomLevel,
  onChangeZoom
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // View transform state: panning & zoom
  const [viewTransform, setViewTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const isSpacePressed = useRef(false);

  // Drawing state
  const isDrawing = useRef(false);
  const currentPoints = useRef([]);
  const [activeDraft, setActiveDraft] = useState(null);

  // Selection & Transformation State
  const [selectedElementIds, setSelectedElementIds] = useState([]);
  const [editingTextId, setEditingTextId] = useState(null);

  // Synchronized refs to avoid stale closures
  const elementsRef = useRef(elements);
  elementsRef.current = elements;
  const editingTextIdRef = useRef(editingTextId);
  editingTextIdRef.current = editingTextId;
  const isJustCreatedRef = useRef(false);
  const hasPushedHistoryForCurrentText = useRef(false);
  const textareaRef = useRef(null);

  // Commit and deploy currently active text box
  const commitCurrentText = useCallback(() => {
    const currentId = editingTextIdRef.current;
    if (!currentId) return;

    const curElements = elementsRef.current;
    const currentEl = curElements.find(el => el.id === currentId);

    if (!currentEl || !currentEl.text || !currentEl.text.trim()) {
      // Discard empty text box cleanly
      onChangeElements(curElements.filter(el => el.id !== currentId));
      setSelectedElementIds(prev => prev.filter(id => id !== currentId));
    } else {
      // Keep deployed text element
      setSelectedElementIds([currentId]);
    }
    setEditingTextId(null);
  }, [onChangeElements]);

  // Focus and caret positioning when editingTextId activates
  useEffect(() => {
    if (editingTextId) {
      hasPushedHistoryForCurrentText.current = false;
      const timer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const len = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(len, len);
        }
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [editingTextId]);

  // Sync text styling properties to selected text elements
  useEffect(() => {
    if (selectedElementIds.length === 0) return;
    const hasText = elementsRef.current.some(
      el => selectedElementIds.includes(el.id) && el.type === 'text'
    );
    if (!hasText) return;

    onChangeElements(prev =>
      prev.map(el => {
        if (!selectedElementIds.includes(el.id) || el.type !== 'text') return el;
        return {
          ...el,
          fontSize: fontSize || 16,
          color: textColor || '#ffffff',
          bold: isBold,
          italic: isItalic,
          strikethrough: isStrikethrough
        };
      })
    );
  }, [fontSize, textColor, isBold, isItalic, isStrikethrough, selectedElementIds, onChangeElements]);
  
  // Marquee selection (Grey selection box)
  const isMarqueeSelecting = useRef(false);
  const marqueeStart = useRef({ x: 0, y: 0 });
  const [marqueeBox, setMarqueeBox] = useState(null);

  // Move elements
  const isDraggingSelection = useRef(false);
  const dragStartCoords = useRef({ x: 0, y: 0 });
  const dragInitialPositions = useRef({});

  // Rotation tool: Hand grab cursor when close/holding to rotate
  const isRotating = useRef(false);
  const isHoveringRotateZone = useRef(false);
  const rotateCenter = useRef({ x: 0, y: 0 });
  const rotateStartAngle = useRef(0);
  const initialRotations = useRef({});
  const [currentAngleDeg, setCurrentAngleDeg] = useState(null);
  const [rotateTooltipPos, setRotateTooltipPos] = useState(null);

  // Dynamic Cursor States
  const [cursorMode, setCursorMode] = useState('default'); // 'default' | 'hand-grab' | 'hand-grabbing' | 'move'
  const [isSpacePressedState, setIsSpacePressedState] = useState(false);
  const [isPanningState, setIsPanningState] = useState(false);

  const inkTimerRef = useRef(null);

  // Sync zoomLevel
  useEffect(() => {
    setViewTransform(prev => ({
      ...prev,
      scale: zoomLevel
    }));
  }, [zoomLevel]);

  // Keyboard Shortcuts: Delete, Space pan
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT') {
        isSpacePressed.current = true;
        setIsSpacePressedState(true);
      }
      if (e.key === 'Enter' && selectedElementIds.length === 1 && !editingTextId && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT') {
        const selectedEl = elements.find(el => el.id === selectedElementIds[0]);
        if (selectedEl && selectedEl.type === 'text') {
          e.preventDefault();
          setEditingTextId(selectedEl.id);
          return;
        }
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementIds.length > 0 && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT') {
        onPushHistory();
        onChangeElements(elements.filter(el => !selectedElementIds.includes(el.id)));
        setSelectedElementIds([]);
      }
    };
    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        isSpacePressed.current = false;
        setIsSpacePressedState(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mode, selectedElementIds, elements, onChangeElements, onPushHistory]);

  // Coordinate Conversion
  const toCanvasCoords = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - viewTransform.x) / viewTransform.scale;
    const y = (clientY - rect.top - viewTransform.y) / viewTransform.scale;
    return { x, y };
  }, [viewTransform]);

  const combinedBounds = getCombinedBounds(elements, selectedElementIds);

  // Check if coordinates are in the move zone (deep center of selected part)
  const checkIsInMoveZone = useCallback((coords) => {
    if (!combinedBounds || selectedElementIds.length === 0 || activeTool !== 'select') return false;
    const { minX, minY, maxX, maxY } = combinedBounds;
    const innerPad = 4 / viewTransform.scale;
    return coords.x >= minX + innerPad && coords.x <= maxX - innerPad && coords.y >= minY + innerPad && coords.y <= maxY - innerPad;
  }, [combinedBounds, selectedElementIds, activeTool, viewTransform.scale]);

  // Check if coordinates are in the rotation zone (perimeter / handles / close to selection)
  const checkIsInRotateZone = useCallback((coords) => {
    if (!combinedBounds || selectedElementIds.length === 0 || activeTool !== 'select') {
      return false;
    }
    const { minX, minY, maxX, maxY } = combinedBounds;
    const scale = viewTransform.scale;
    const outerPad = 32 / scale;
    const innerPad = 4 / scale;

    const inOuter = coords.x >= minX - outerPad && coords.x <= maxX + outerPad && coords.y >= minY - outerPad && coords.y <= maxY + outerPad;
    const inDeepCenter = coords.x >= minX + innerPad && coords.x <= maxX - innerPad && coords.y >= minY + innerPad && coords.y <= maxY - innerPad;

    return inOuter && !inDeepCenter;
  }, [combinedBounds, selectedElementIds, activeTool, viewTransform.scale]);

  // Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId;
    let lastRenderTime = 0;
    const fps = settings.performance?.fpsLimit;
    const frameInterval = fps === '30' ? 1000 / 30 : fps === '60' ? 1000 / 60 : 0;

    const render = (currentTime) => {
      if (frameInterval > 0 && currentTime - lastRenderTime < frameInterval) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }
      lastRenderTime = currentTime;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Pan & Zoom
      ctx.translate(viewTransform.x, viewTransform.y);
      ctx.scale(viewTransform.scale, viewTransform.scale);

      // 1. Render all elements
      for (const el of elements) {
        if (el.id === editingTextId) continue;
        if (el.type === 'pen') drawPenStrokeToContext(ctx, el);
        else if (el.type === 'shape') drawShapeToContext(ctx, el);
        else if (el.type === 'line') drawLineToContext(ctx, el);
        else if (el.type === 'text') drawTextToContext(ctx, el);
        else if (el.type === 'image') drawImageToContext(ctx, el);
      }

      // 2. Render live draft
      if (activeDraft) {
        if (activeDraft.type === 'pen') drawPenStrokeToContext(ctx, activeDraft);
        else if (activeDraft.type === 'shape') drawShapeToContext(ctx, activeDraft);
        else if (activeDraft.type === 'line') drawLineToContext(ctx, activeDraft);
      }

      // 3. Selection Bounding Box & 8 Circular Handles (Grey dashed outline)
      if (combinedBounds && selectedElementIds.length > 0 && activeTool === 'select') {
        const { minX, minY, maxX, maxY, centerX, centerY } = combinedBounds;
        const pad = 4;
        const boxX = minX - pad;
        const boxY = minY - pad;
        const boxW = (maxX - minX) + pad * 2;
        const boxH = (maxY - minY) + pad * 2;

        ctx.save();
        // Calm Grey dashed selection outline
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 1 / viewTransform.scale;
        ctx.setLineDash([3 / viewTransform.scale, 3 / viewTransform.scale]);
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Center origin dot
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3 / viewTransform.scale, 0, Math.PI * 2);
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 1 / viewTransform.scale;
        ctx.stroke();

        // 8 small circular handles (matching Photo 2)
        const handleRadius = 3.5 / viewTransform.scale;
        const handlePoints = [
          [boxX, boxY],
          [boxX + boxW / 2, boxY],
          [boxX + boxW, boxY],
          [boxX, boxY + boxH / 2],
          [boxX + boxW, boxY + boxH / 2],
          [boxX, boxY + boxH],
          [boxX + boxW / 2, boxY + boxH],
          [boxX + boxW, boxY + boxH]
        ];

        for (const [hx, hy] of handlePoints) {
          ctx.beginPath();
          ctx.arc(hx, hy, handleRadius, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#4b5563';
          ctx.lineWidth = 1 / viewTransform.scale;
          ctx.stroke();
        }

        // Live rotation angle tooltip when rotating
        if (currentAngleDeg !== null && rotateTooltipPos) {
          ctx.save();
          ctx.fillStyle = 'rgba(17, 24, 39, 0.9)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1 / viewTransform.scale;
          const badgeW = 44 / viewTransform.scale;
          const badgeH = 18 / viewTransform.scale;
          const badgeX = rotateTooltipPos.x + 14 / viewTransform.scale;
          const badgeY = rotateTooltipPos.y - 20 / viewTransform.scale;
          ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
          ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${10 / viewTransform.scale}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${Math.round(currentAngleDeg)}°`, badgeX + badgeW / 2, badgeY + badgeH / 2);
          ctx.restore();
        }

        ctx.restore();
      }

      // 4. Marquee Square Selection Box (GREY color instead of blue)
      if (marqueeBox) {
        ctx.save();
        // Grey translucent fill
        ctx.fillStyle = 'rgba(156, 163, 175, 0.14)';
        // Grey dashed border
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 1 / viewTransform.scale;
        ctx.setLineDash([4 / viewTransform.scale, 3 / viewTransform.scale]);
        ctx.fillRect(marqueeBox.x, marqueeBox.y, marqueeBox.width, marqueeBox.height);
        ctx.strokeRect(marqueeBox.x, marqueeBox.y, marqueeBox.width, marqueeBox.height);
        ctx.restore();
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [elements, viewTransform, activeDraft, selectedElementIds, combinedBounds, marqueeBox, editingTextId, activeTool, currentAngleDeg, rotateTooltipPos, settings.performance?.fpsLimit]);

  // Pointer Down
  const handlePointerDown = (e) => {
    if (e.button === 1 || isSpacePressed.current || mode === 'view') {
      isPanning.current = true;
      panStart.current = { x: e.clientX - viewTransform.x, y: e.clientY - viewTransform.y };
      setIsPanningState(true);
      return;
    }

    if (mode !== 'edit') return;

    // If already editing a text element, clicking on the canvas deploys / commits it
    if (editingTextIdRef.current) {
      commitCurrentText();
      return;
    }

    const coords = toCanvasCoords(e.clientX, e.clientY);

    // 1. Check if clicking in Rotate Zone next to selected part -> Hand Grab to Rotate
    if (checkIsInRotateZone(coords)) {
      isRotating.current = true;
      rotateCenter.current = { x: combinedBounds.centerX, y: combinedBounds.centerY };
      rotateStartAngle.current = Math.atan2(coords.y - combinedBounds.centerY, coords.x - combinedBounds.centerX);
      setRotateTooltipPos(coords);
      setCursorMode('hand-grabbing');

      initialRotations.current = {};
      for (const id of selectedElementIds) {
        const el = elements.find(item => item.id === id);
        if (el) initialRotations.current[id] = el.rotation || 0;
      }
      return;
    }

    // 2. Select Tool Handling
    if (activeTool === 'select') {
      // Check if clicking inside already selected bounding box to drag/move
      if (combinedBounds && selectedElementIds.length > 0) {
        const { minX, minY, maxX, maxY } = combinedBounds;
        const pad = 4;
        if (coords.x >= minX - pad && coords.x <= maxX + pad && coords.y >= minY - pad && coords.y <= maxY + pad) {
          isDraggingSelection.current = true;
          dragStartCoords.current = coords;
          dragInitialPositions.current = {};
          setCursorMode('move');
          for (const id of selectedElementIds) {
            const el = elements.find(item => item.id === id);
            if (el) {
              dragInitialPositions.current[id] = {
                x: el.x,
                y: el.y,
                x1: el.x1,
                y1: el.y1,
                x2: el.x2,
                y2: el.y2,
                points: el.points ? [...el.points] : null
              };
            }
          }
          return;
        }
      }

      // Check single element click
      const clicked = [...elements].reverse().find(el => {
        const b = getSingleElementBounds(el);
        return coords.x >= b.minX - 4 && coords.x <= b.maxX + 4 && coords.y >= b.minY - 4 && coords.y <= b.maxY + 4;
      });

      if (clicked) {
        if (e.shiftKey) {
          setSelectedElementIds(prev =>
            prev.includes(clicked.id) ? prev.filter(id => id !== clicked.id) : [...prev, clicked.id]
          );
        } else {
          setSelectedElementIds([clicked.id]);
        }
        isDraggingSelection.current = true;
        dragStartCoords.current = coords;
        setCursorMode('move');
        dragInitialPositions.current = {
          [clicked.id]: {
            x: clicked.x,
            y: clicked.y,
            x1: clicked.x1,
            y1: clicked.y1,
            x2: clicked.x2,
            y2: clicked.y2,
            points: clicked.points ? [...clicked.points] : null
          }
        };
        return;
      }

      // Empty space -> Start Marquee Square Selection (Grey box)
      isMarqueeSelecting.current = true;
      marqueeStart.current = coords;
      setMarqueeBox({ x: coords.x, y: coords.y, width: 0, height: 0 });
      if (!e.shiftKey) {
        setSelectedElementIds([]);
      }
      return;
    }

    // 3. Text Tool
    if (activeTool === 'text') {
      // Check if user clicked an existing text element to edit it
      const clickedText = [...elementsRef.current].reverse().find(el => {
        if (el.type !== 'text') return false;
        const b = getSingleElementBounds(el);
        return coords.x >= b.minX - 6 && coords.x <= b.maxX + 6 && coords.y >= b.minY - 6 && coords.y <= b.maxY + 6;
      });

      if (clickedText) {
        setSelectedElementIds([clickedText.id]);
        setEditingTextId(clickedText.id);
        return;
      }

      const newText = {
        id: 'text_' + Date.now(),
        type: 'text',
        text: '', // Empty initially: "Type text here..." is placeholder guide only
        x: coords.x,
        y: coords.y,
        fontSize: fontSize || 16,
        color: textColor || '#ffffff',
        bold: isBold,
        italic: isItalic,
        strikethrough: isStrikethrough,
        opacity: transparency,
        rotation: 0
      };

      // Mark as just created to ignore immediate focus loss on click release
      isJustCreatedRef.current = true;
      setTimeout(() => {
        isJustCreatedRef.current = false;
      }, 400);

      onChangeElements([...elementsRef.current, newText]);
      setSelectedElementIds([newText.id]);
      setEditingTextId(newText.id);
      return;
    }

    // 4. Pen Tool
    if (activeTool === 'pen') {
      isDrawing.current = true;
      currentPoints.current = [coords];
      setActiveDraft({
        id: 'draft_pen',
        type: 'pen',
        points: [coords],
        strokeColor,
        strokeWidth: strokeWeight,
        opacity: transparency,
        rotation: 0
      });
      return;
    }

    // 5. Shape Tool
    if (activeTool === 'shape') {
      isDrawing.current = true;
      panStart.current = coords;
      setActiveDraft({
        id: 'draft_shape',
        type: 'shape',
        shapeType: currentShape || 'rectangle',
        x: coords.x,
        y: coords.y,
        width: 1,
        height: 1,
        strokeColor,
        strokeWidth: strokeWeight,
        fillColor: 'transparent',
        opacity: transparency,
        rotation: 0
      });
      return;
    }

    // 6. Line Tool
    if (activeTool === 'line') {
      isDrawing.current = true;
      panStart.current = coords;
      setActiveDraft({
        id: 'draft_line',
        type: 'line',
        x1: coords.x,
        y1: coords.y,
        x2: coords.x,
        y2: coords.y,
        strokeColor,
        strokeWidth: strokeWeight,
        opacity: transparency,
        isArrow: currentShape === 'arrow',
        rotation: 0
      });
      return;
    }
  };

  // Pointer Move
  const handlePointerMove = (e) => {
    if (isPanning.current) {
      setViewTransform(prev => ({
        ...prev,
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y
      }));
      return;
    }

    const coords = toCanvasCoords(e.clientX, e.clientY);

    // 1. Dynamic Cursor: Hand Grab Cursor when close/hovering next to selected part
    if (activeTool === 'select' && !isDraggingSelection.current && !isMarqueeSelecting.current && !isRotating.current) {
      if (checkIsInRotateZone(coords)) {
        if (cursorMode !== 'hand-grab') setCursorMode('hand-grab');
      } else if (checkIsInMoveZone(coords)) {
        if (cursorMode !== 'move') setCursorMode('move');
      } else {
        if (cursorMode !== 'default') setCursorMode('default');
      }
    }

    // 2. Interactive Rotation Drag (Hand Grabbing)
    if (isRotating.current) {
      if (cursorMode !== 'hand-grabbing') setCursorMode('hand-grabbing');
      setRotateTooltipPos(coords);
      const currentAngle = Math.atan2(coords.y - rotateCenter.current.y, coords.x - rotateCenter.current.x);
      let deltaAngle = currentAngle - rotateStartAngle.current;

      if (e.shiftKey) {
        const snap = Math.PI / 12; // 15 deg
        deltaAngle = Math.round(deltaAngle / snap) * snap;
      }

      const deg = ((deltaAngle * 180) / Math.PI) % 360;
      setCurrentAngleDeg(deg >= 0 ? deg : deg + 360);

      onChangeElements(elements.map(el => {
        if (!selectedElementIds.includes(el.id)) return el;
        const initial = initialRotations.current[el.id] || 0;
        return {
          ...el,
          rotation: initial + deltaAngle
        };
      }));
      return;
    }

    // 3. Move Elements Drag
    if (isDraggingSelection.current && selectedElementIds.length > 0) {
      const dx = coords.x - dragStartCoords.current.x;
      const dy = coords.y - dragStartCoords.current.y;

      onChangeElements(elements.map(el => {
        if (!selectedElementIds.includes(el.id)) return el;
        const initial = dragInitialPositions.current[el.id];
        if (!initial) return el;

        if (el.type === 'shape' || el.type === 'image' || el.type === 'text') {
          return {
            ...el,
            x: initial.x + dx,
            y: initial.y + dy
          };
        }
        if (el.type === 'line') {
          return {
            ...el,
            x1: initial.x1 + dx,
            y1: initial.y1 + dy,
            x2: initial.x2 + dx,
            y2: initial.y2 + dy
          };
        }
        if (el.type === 'pen' && initial.points) {
          return {
            ...el,
            points: initial.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
          };
        }
        return el;
      }));
      return;
    }

    // 4. Marquee Square Select Dragging (Grey selection box)
    if (isMarqueeSelecting.current) {
      const start = marqueeStart.current;
      const x = Math.min(start.x, coords.x);
      const y = Math.min(start.y, coords.y);
      const width = Math.abs(coords.x - start.x);
      const height = Math.abs(coords.y - start.y);

      setMarqueeBox({ x, y, width, height });

      const enclosed = elements.filter(el => {
        const b = getSingleElementBounds(el);
        return !(b.maxX < x || b.minX > x + width || b.maxY < y || b.minY > y + height);
      }).map(el => el.id);

      setSelectedElementIds(enclosed);
      return;
    }

    // 5. Pen Drawing
    if (isDrawing.current && activeTool === 'pen') {
      currentPoints.current.push(coords);
      setActiveDraft(prev => ({
        ...prev,
        points: [...currentPoints.current]
      }));
      return;
    }

    // 6. Shape Drawing
    if (isDrawing.current && activeTool === 'shape') {
      const start = panStart.current;
      let x = Math.min(start.x, coords.x);
      let y = Math.min(start.y, coords.y);
      let width = Math.abs(coords.x - start.x);
      let height = Math.abs(coords.y - start.y);

      if (e.shiftKey) {
        const side = Math.max(width, height);
        width = side;
        height = side;
        x = coords.x < start.x ? start.x - side : start.x;
        y = coords.y < start.y ? start.y - side : start.y;
      }

      setActiveDraft(prev => ({
        ...prev,
        x,
        y,
        width,
        height
      }));
      return;
    }

    // 7. Line Drawing
    if (isDrawing.current && activeTool === 'line') {
      let x2 = coords.x;
      let y2 = coords.y;
      if (settings.inkToShape?.arrowSnapping) {
        const dx = x2 - panStart.current.x;
        const dy = y2 - panStart.current.y;
        const dist = Math.hypot(dx, dy);
        let angle = Math.atan2(dy, dx);
        const snapIncrement = Math.PI / 4;
        const snappedAngle = Math.round(angle / snapIncrement) * snapIncrement;
        if (Math.abs(angle - snappedAngle) < 0.16) {
          x2 = panStart.current.x + dist * Math.cos(snappedAngle);
          y2 = panStart.current.y + dist * Math.sin(snappedAngle);
        }
      }
      setActiveDraft(prev => ({
        ...prev,
        x2,
        y2
      }));
      return;
    }
  };

  // Pointer Up
  const handlePointerUp = (e) => {
    if (isPanning.current) {
      isPanning.current = false;
      setIsPanningState(false);
      return;
    }

    const coords = e && e.clientX !== undefined ? toCanvasCoords(e.clientX, e.clientY) : null;

    if (isRotating.current) {
      isRotating.current = false;
      setCurrentAngleDeg(null);
      setRotateTooltipPos(null);
      if (coords && checkIsInRotateZone(coords)) {
        setCursorMode('hand-grab');
      } else {
        setCursorMode('default');
      }
      onPushHistory();
      return;
    }

    if (isDraggingSelection.current) {
      isDraggingSelection.current = false;
      if (coords && checkIsInMoveZone(coords)) {
        setCursorMode('move');
      } else {
        setCursorMode('default');
      }
      onPushHistory();
      return;
    }

    if (isMarqueeSelecting.current) {
      isMarqueeSelecting.current = false;
      setMarqueeBox(null);
      setCursorMode('default');
      return;
    }

    if (!isDrawing.current) return;
    isDrawing.current = false;

    // Finish Pen Stroke
    if (activeTool === 'pen' && currentPoints.current.length > 1) {
      const strokePoints = [...currentPoints.current];
      const newStrokeId = 'pen_' + Date.now();
      const strokeObj = {
        id: newStrokeId,
        type: 'pen',
        points: strokePoints,
        strokeColor,
        strokeWidth: strokeWeight,
        opacity: transparency,
        rotation: 0
      };

      onPushHistory();
      onChangeElements([...elements, strokeObj]);
      setActiveDraft(null);

      // Auto-Shape (Ink-to-Shape)
      if (settings.inkToShape?.enabled) {
        const delay = settings.inkToShape?.delayMs || 500;
        if (inkTimerRef.current) clearTimeout(inkTimerRef.current);

        inkTimerRef.current = setTimeout(() => {
          const recognized = recognizeStroke(strokePoints);
          if (recognized && recognized.recognized) {
            onChangeElements(prevElements => {
              return prevElements.map(el => {
                if (el.id !== newStrokeId) return el;
                if (recognized.shapeType === 'line' || recognized.shapeType === 'arrow') {
                  return {
                    id: 'shape_' + Date.now(),
                    type: 'line',
                    x1: recognized.x1,
                    y1: recognized.y1,
                    x2: recognized.x2,
                    y2: recognized.y2,
                    strokeColor,
                    strokeWidth: strokeWeight,
                    opacity: transparency,
                    isArrow: recognized.shapeType === 'arrow',
                    rotation: 0
                  };
                } else {
                  return {
                    id: 'shape_' + Date.now(),
                    type: 'shape',
                    shapeType: recognized.shapeType,
                    x: recognized.x,
                    y: recognized.y,
                    width: recognized.width,
                    height: recognized.height,
                    strokeColor,
                    strokeWidth: strokeWeight,
                    fillColor: 'transparent',
                    opacity: transparency,
                    rotation: 0
                  };
                }
              });
            });
          }
        }, delay);
      }
      return;
    }

    // Finish Shape or Line
    if (activeDraft && (activeTool === 'shape' || activeTool === 'line')) {
      if (activeDraft.type === 'shape' && (activeDraft.width > 5 || activeDraft.height > 5)) {
        onPushHistory();
        const newEl = { ...activeDraft, id: 'shape_' + Date.now() };
        onChangeElements([...elements, newEl]);
        setSelectedElementIds([newEl.id]);
      } else if (activeDraft.type === 'line' && Math.hypot(activeDraft.x2 - activeDraft.x1, activeDraft.y2 - activeDraft.y1) > 5) {
        onPushHistory();
        const newEl = { ...activeDraft, id: 'line_' + Date.now() };
        onChangeElements([...elements, newEl]);
        setSelectedElementIds([newEl.id]);
      }
      setActiveDraft(null);
    }
  };

  // Wheel Zoom centered on cursor
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.max(0.1, Math.min(5, viewTransform.scale * zoomFactor));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newX = mouseX - (mouseX - viewTransform.x) * (newScale / viewTransform.scale);
    const newY = mouseY - (mouseY - viewTransform.y) * (newScale / viewTransform.scale);

    setViewTransform({
      x: newX,
      y: newY,
      scale: newScale
    });
    onChangeZoom(newScale);
  };

  const editingTextElement = elements.find(el => el.id === editingTextId);

  // Double click handler to edit existing text
  const handleDoubleClick = (e) => {
    if (mode === 'view') return;
    const coords = toCanvasCoords(e.clientX, e.clientY);

    const clickedText = [...elementsRef.current].reverse().find(el => {
      if (el.type !== 'text') return false;
      const b = getSingleElementBounds(el);
      return coords.x >= b.minX - 8 && coords.x <= b.maxX + 8 && coords.y >= b.minY - 8 && coords.y <= b.maxY + 8;
    });

    if (clickedText) {
      setSelectedElementIds([clickedText.id]);
      setEditingTextId(clickedText.id);
    }
  };

  // Active cursor class determined by tool, view mode, space-drag, and rotate/move proximity
  const getActiveCursorClass = () => {
    if (mode === 'view' || isSpacePressedState) {
      return isPanningState ? 'cursor-hand-grabbing' : 'cursor-hand-grab';
    }
    if (activeTool === 'select') {
      if (cursorMode === 'hand-grabbing') return 'cursor-hand-grabbing';
      if (cursorMode === 'hand-grab') return 'cursor-hand-grab';
      if (cursorMode === 'move') return 'cursor-move';
      return 'cursor-default';
    }
    return 'cursor-crosshair';
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={`relative w-full h-full overflow-hidden select-none bg-transparent ${getActiveCursorClass()} ${
        pattern === 'grid' ? 'pattern-grid' : pattern === 'dotted' ? 'pattern-dotted' : ''
      }`}
    >
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full block ${getActiveCursorClass()}`}
      />

      {/* Inline Textarea Overlay */}
      {editingTextElement && (
        <textarea
          ref={textareaRef}
          autoFocus
          value={editingTextElement.text}
          placeholder="Type text here..."
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            if (!hasPushedHistoryForCurrentText.current) {
              onPushHistory();
              hasPushedHistoryForCurrentText.current = true;
            }
            const val = e.target.value;
            onChangeElements(elementsRef.current.map(el => el.id === editingTextId ? { ...el, text: val } : el));
          }}
          onBlur={() => {
            if (isJustCreatedRef.current) {
              textareaRef.current?.focus();
              return;
            }
            commitCurrentText();
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              commitCurrentText();
              return;
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              commitCurrentText();
              return;
            }
          }}
          style={{
            position: 'absolute',
            left: `${editingTextElement.x * viewTransform.scale + viewTransform.x}px`,
            top: `${editingTextElement.y * viewTransform.scale + viewTransform.y - ((editingTextElement.fontSize || 16) * viewTransform.scale * 1.15)}px`,
            fontSize: `${(editingTextElement.fontSize || 16) * viewTransform.scale}px`,
            lineHeight: 1.35,
            color: editingTextElement.color || '#ffffff',
            fontWeight: editingTextElement.bold ? 'bold' : 'normal',
            fontStyle: editingTextElement.italic ? 'italic' : 'normal',
            textDecoration: editingTextElement.strikethrough ? 'line-through' : 'none',
            background: 'rgba(20, 20, 25, 0.88)',
            border: '1px dashed rgba(255, 255, 255, 0.45)',
            borderRadius: '6px',
            padding: '4px 8px',
            outline: 'none',
            resize: 'both',
            zIndex: 40,
            minWidth: '160px',
            minHeight: `${(editingTextElement.fontSize || 16) * viewTransform.scale * 1.8}px`,
            fontFamily: 'Inter, sans-serif'
          }}
        />
      )}
    </div>
  );
}
