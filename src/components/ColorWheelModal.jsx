import React, { useState, useEffect, useRef, useCallback } from 'react';

function hsvToRgb(h, s, v) {
  let r, g, b;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
    default: r = 0; g = 0; b = 0;
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max === min) {
    h = 0;
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0;
    }
    h /= 6;
  }
  return { h, s, v };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const num = parseInt(hex, 16);
  if (isNaN(num)) return { r: 255, g: 255, b: 255 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

const DEFAULT_PALETTE = [
  '#000000', '#1c1c1c', '#383838', '#545454', '#707070', '#8c8c8c', '#a8a8a8', '#c4c4c4', '#e0e0e0', '#ffffff',
  '#e53935', '#f57c00', '#fbc02d', '#7cb342', '#43a047', '#00acc1', '#1e88e5', '#3949ab', '#8e24aa', '#d81b60',
  '#ff5252', '#ff7a00', '#ffd600', '#aeea00', '#00e676', '#18ffff', '#448aff', '#7c4dff', '#e040fb', '#ff4081'
];

export default function ColorWheelModal({ isOpen, onClose, currentColor = '#ffffff', onSelectColor }) {
  const [primaryColor, setPrimaryColor] = useState(currentColor);
  const [secondaryColor, setSecondaryColor] = useState('#16171a');
  const [showMore, setShowMore] = useState(false);
  const [customPalette, setCustomPalette] = useState(() => {
    try {
      const saved = localStorage.getItem('blackboard_custom_palette');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const canvasRef = useRef(null);
  const [hsv, setHsv] = useState({ h: 0, s: 0, v: 1 });
  const isDraggingWheel = useRef(false);

  useEffect(() => {
    if (currentColor) {
      setPrimaryColor(currentColor);
      const rgb = hexToRgb(currentColor);
      setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
    }
  }, [currentColor, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = width / 2 - 4;

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const index = (y * width + x) * 4;

        if (dist <= radius) {
          let angle = Math.atan2(dy, dx);
          if (angle < 0) angle += Math.PI * 2;
          const hue = angle / (Math.PI * 2);
          const sat = Math.min(1, dist / radius);
          const val = hsv.v;

          const rgb = hsvToRgb(hue, sat, val);
          data[index] = rgb.r;
          data[index + 1] = rgb.g;
          data[index + 2] = rgb.b;
          data[index + 3] = 255;
        } else {
          data[index + 3] = 0;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const pickerAngle = hsv.h * Math.PI * 2;
    const pickerDist = hsv.s * radius;
    const px = cx + Math.cos(pickerAngle) * pickerDist;
    const py = cy + Math.sin(pickerAngle) * pickerDist;

    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.strokeStyle = hsv.v > 0.5 && hsv.s < 0.4 ? '#000000' : '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.stroke();
    ctx.restore();
  }, [isOpen, hsv]);

  const updateFromCoords = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const x = clientX - rect.left - cx;
    const y = clientY - rect.top - cy;
    const radius = rect.width / 2 - 4;

    let angle = Math.atan2(y, x);
    if (angle < 0) angle += Math.PI * 2;
    const hue = angle / (Math.PI * 2);
    const dist = Math.sqrt(x * x + y * y);
    const sat = Math.min(1, Math.max(0, dist / radius));

    const newHsv = { h: hue, s: sat, v: hsv.v };
    setHsv(newHsv);
    const rgb = hsvToRgb(hue, sat, hsv.v);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    setPrimaryColor(hex);
    onSelectColor && onSelectColor(hex);
  }, [hsv.v, onSelectColor]);

  const handlePointerDown = (e) => {
    isDraggingWheel.current = true;
    updateFromCoords(e.clientX, e.clientY);
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (isDraggingWheel.current) {
        updateFromCoords(e.clientX, e.clientY);
      }
    };
    const handleUp = () => {
      isDraggingWheel.current = false;
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [updateFromCoords]);

  const handleSwapColors = () => {
    const temp = primaryColor;
    setPrimaryColor(secondaryColor);
    setSecondaryColor(temp);
    const rgb = hexToRgb(secondaryColor);
    setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
    onSelectColor && onSelectColor(secondaryColor);
  };

  const handleResetBlackWhite = () => {
    setPrimaryColor('#000000');
    setSecondaryColor('#ffffff');
    setHsv({ h: 0, s: 0, v: 0 });
    onSelectColor && onSelectColor('#000000');
  };

  const handleAddCustomColor = () => {
    if (!customPalette.includes(primaryColor)) {
      const updated = [...customPalette, primaryColor].slice(-20);
      setCustomPalette(updated);
      localStorage.setItem('blackboard_custom_palette', JSON.stringify(updated));
    }
  };

  const handleSelectPaletteColor = (c) => {
    setPrimaryColor(c);
    const rgb = hexToRgb(c);
    setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
    onSelectColor && onSelectColor(c);
  };

  if (!isOpen) return null;

  const currentRgb = hexToRgb(primaryColor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-popover p-4">
      <div className="relative w-[360px] max-w-[94vw] rounded-3xl glossy-panel p-6 text-gray-200 select-none shadow-2xl border border-white/20">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
            <span className="text-sm font-bold tracking-wide text-white">Colors</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Top Control Bar: Dual Swatches & More >> */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            {/* Dual Swatch Box */}
            <div className="relative w-12 h-12">
              <div
                className="absolute right-0 bottom-0 w-8 h-8 rounded-lg border border-white/25 shadow-inner cursor-pointer"
                style={{ backgroundColor: secondaryColor }}
                onClick={handleSwapColors}
                title="Secondary Color (Click to swap)"
              />
              <div
                className="absolute left-0 top-0 w-8 h-8 rounded-lg border-2 border-white/70 shadow-lg cursor-pointer z-10"
                style={{ backgroundColor: primaryColor }}
                title="Primary Color"
              />
            </div>

            {/* Swap Button */}
            <button
              onClick={handleSwapColors}
              className="p-1.5 rounded-lg hover:bg-white/15 text-blue-400 hover:text-blue-300 transition text-sm cursor-pointer"
              title="Swap primary and secondary colors"
            >
              ⇄
            </button>

            {/* Reset to B/W */}
            <button
              onClick={handleResetBlackWhite}
              className="relative w-6 h-6 rounded-md border border-white/25 hover:border-white/60 transition overflow-hidden cursor-pointer"
              title="Default black and white"
            >
              <div className="w-full h-1/2 bg-black"></div>
              <div className="w-full h-1/2 bg-white"></div>
            </button>
          </div>

          {/* More >> Button */}
          <button
            onClick={() => setShowMore(!showMore)}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl glossy-button text-gray-300 hover:text-white cursor-pointer"
          >
            {showMore ? 'Less <<' : 'More >>'}
          </button>
        </div>

        {/* Center: Color Wheel & Brightness Slider */}
        <div className="flex flex-col items-center justify-center gap-3.5 mb-4">
          <div className="relative p-2.5 rounded-full bg-black/50 border border-white/15 shadow-inner">
            <canvas
              ref={canvasRef}
              width={200}
              height={200}
              onPointerDown={handlePointerDown}
              className="cursor-crosshair rounded-full"
            />
          </div>

          {/* Value / Brightness Slider */}
          <div className="w-full flex items-center gap-3 px-1">
            <span className="text-xs text-slate-300 font-medium">Value</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={hsv.v}
              onChange={(e) => {
                const newV = parseFloat(e.target.value);
                setHsv(prev => ({ ...prev, v: newV }));
                const rgb = hsvToRgb(hsv.h, hsv.s, newV);
                const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
                setPrimaryColor(hex);
                onSelectColor && onSelectColor(hex);
              }}
              className="flex-1 h-2 bg-gradient-to-r from-black via-gray-400 to-white rounded-lg appearance-none cursor-pointer outline-none"
            />
            <span className="text-xs text-slate-300 font-mono w-8 text-right font-bold">
              {Math.round(hsv.v * 100)}%
            </span>
          </div>
        </div>

        {/* Precision Inputs when "More >>" is toggled */}
        {showMore && (
          <div className="mb-4 p-3.5 rounded-2xl glossy-panel-slot flex flex-col gap-2.5 text-xs border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-mono font-medium">HEX</span>
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => {
                  const val = e.target.value;
                  setPrimaryColor(val);
                  if (/^#[0-9A-F]{6}$/i.test(val)) {
                    const rgb = hexToRgb(val);
                    setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
                    onSelectColor && onSelectColor(val);
                  }
                }}
                className="w-28 px-2.5 py-1 rounded-lg bg-black/70 border border-white/20 text-center font-mono font-semibold text-white outline-none focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-red-400 font-mono font-bold">R</span>
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={currentRgb.r}
                  onChange={(e) => {
                    const r = Math.min(255, Math.max(0, parseInt(e.target.value) || 0));
                    const hex = rgbToHex(r, currentRgb.g, currentRgb.b);
                    setPrimaryColor(hex);
                    setHsv(rgbToHsv(r, currentRgb.g, currentRgb.b));
                    onSelectColor && onSelectColor(hex);
                  }}
                  className="w-full px-2 py-1 rounded-lg bg-black/70 border border-white/20 text-center font-mono text-white text-xs outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-green-400 font-mono font-bold">G</span>
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={currentRgb.g}
                  onChange={(e) => {
                    const g = Math.min(255, Math.max(0, parseInt(e.target.value) || 0));
                    const hex = rgbToHex(currentRgb.r, g, currentRgb.b);
                    setPrimaryColor(hex);
                    setHsv(rgbToHsv(currentRgb.r, g, currentRgb.b));
                    onSelectColor && onSelectColor(hex);
                  }}
                  className="w-full px-2 py-1 rounded-lg bg-black/70 border border-white/20 text-center font-mono text-white text-xs outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-blue-400 font-mono font-bold">B</span>
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={currentRgb.b}
                  onChange={(e) => {
                    const b = Math.min(255, Math.max(0, parseInt(e.target.value) || 0));
                    const hex = rgbToHex(currentRgb.r, currentRgb.g, b);
                    setPrimaryColor(hex);
                    setHsv(rgbToHsv(currentRgb.r, currentRgb.g, b));
                    onSelectColor && onSelectColor(hex);
                  }}
                  className="w-full px-2 py-1 rounded-lg bg-black/70 border border-white/20 text-center font-mono text-white text-xs outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Bottom Swatches Palette */}
        <div className="border-t border-white/10 pt-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs text-slate-300 font-medium">Palette Swatches</span>
            <button
              onClick={handleAddCustomColor}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
              title="Add current color to palette"
            >
              <span>+</span> Add Custom
            </button>
          </div>

          <div className="grid grid-cols-10 gap-2 mb-2.5">
            {DEFAULT_PALETTE.map((c, i) => (
              <button
                key={i}
                onClick={() => handleSelectPaletteColor(c)}
                style={{ backgroundColor: c }}
                className={`w-6 h-6 rounded-lg border transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] hover:scale-120 active:scale-90 shadow-sm cursor-pointer ${
                  primaryColor.toLowerCase() === c.toLowerCase()
                    ? 'border-blue-400 scale-115 ring-2 ring-blue-500/60'
                    : 'border-white/20'
                }`}
                title={c}
              />
            ))}
          </div>

          {customPalette.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              <span className="text-[11px] text-slate-400 mr-1 font-medium">Custom:</span>
              {customPalette.map((c, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectPaletteColor(c)}
                  style={{ backgroundColor: c }}
                  className="w-5 h-5 flex-shrink-0 rounded-md border border-white/25 hover:scale-125 active:scale-90 transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer"
                  title={c}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
