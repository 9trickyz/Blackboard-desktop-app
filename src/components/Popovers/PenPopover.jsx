import React from 'react';

export default function PenPopover({
  isOpen,
  onClose,
  strokeColor,
  onOpenColorWheel,
  strokeWeight,
  onChangeStrokeWeight,
  transparency,
  onChangeTransparency
}) {
  if (!isOpen) return null;

  return (
    <div className="absolute top-[68px] left-[42%] -translate-x-1/2 z-40 animate-popover">
      <div className="calm-tile rounded-xl p-3 flex flex-col gap-2.5 shadow-xl border border-white/[0.06] min-w-[200px]">
        
        {/* Color Wheel Option */}
        <div
          onClick={onOpenColorWheel}
          className="group flex items-center gap-3 p-1.5 rounded-md hover:bg-white/[0.06] cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] text-xs font-semibold text-gray-200"
          title="Choose Stroke Color"
        >
          <div
            className="w-4 h-4 rounded-full border border-white/70 shadow-sm flex-shrink-0 group-hover:scale-110 transition-transform duration-200"
            style={{ backgroundColor: strokeColor || '#ffffff' }}
          />
          <span>Color wheel</span>
        </div>

        {/* Stroke Weight Option */}
        <div className="flex flex-col gap-1 p-2 rounded-md bg-black/40 border border-white/[0.04]">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-200">
            <div className="flex items-center gap-2">
              <img
                src="./icons/StrokeWeightIcon.png"
                alt="Stroke weight"
                className="w-4 h-4 object-contain"
              />
              <span className="font-mono font-bold text-white text-xs">{strokeWeight}</span>
            </div>
            <span className="text-[11px] text-slate-400">Stroke weight</span>
          </div>
          <input
            type="range"
            min="1"
            max="64"
            value={strokeWeight}
            onChange={(e) => onChangeStrokeWeight(parseInt(e.target.value) || 1)}
            className="w-full h-1 bg-gray-700 rounded appearance-none cursor-pointer accent-blue-500 mt-1"
          />
        </div>

        {/* Transparency Option */}
        <div className="flex flex-col gap-1 p-2 rounded-md bg-black/40 border border-white/[0.04]">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-200">
            <div className="flex items-center gap-2">
              <img
                src="./icons/TransparencyIcon.png"
                alt="Transparency"
                className="w-4 h-4 object-contain"
              />
              <span className="font-mono font-bold text-white text-xs">{transparency}%</span>
            </div>
            <span className="text-[11px] text-slate-400">Transparency</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={transparency}
            onChange={(e) => onChangeTransparency(parseInt(e.target.value) || 100)}
            className="w-full h-1 bg-gray-700 rounded appearance-none cursor-pointer accent-blue-500 mt-1"
          />
        </div>

      </div>
    </div>
  );
}
