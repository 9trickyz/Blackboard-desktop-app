import React, { useState } from 'react';

export default function TitleBar({
  title,
  onChangeTitle,
  isMinitab,
  onMinimize,
  onMinitab,
  onClose
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);

  const handleBlur = () => {
    setIsEditing(false);
    if (tempTitle.trim()) {
      onChangeTitle(tempTitle.trim());
    } else {
      setTempTitle(title);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setTempTitle(title);
    }
  };

  return (
    <div className="relative w-full h-12 flex items-center justify-between px-5 z-30 drag-region select-none">
      {/* Left spacer for window drag */}
      <div className="w-28 no-drag"></div>

      {/* Center Title */}
      <div className="flex items-center justify-center no-drag">
        {isEditing ? (
          <input
            type="text"
            value={tempTitle}
            onChange={(e) => setTempTitle(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            className="px-3 py-1 rounded-xl bg-black/70 border border-blue-400 text-sm font-semibold text-white text-center outline-none shadow-lg"
          />
        ) : (
          <div
            onClick={() => {
              setTempTitle(title);
              setIsEditing(true);
            }}
            className="px-4 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 cursor-pointer text-sm font-semibold text-gray-200 hover:text-white hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] tracking-wide flex items-center gap-2 shadow-sm"
            title="Click to rename board"
          >
            <span>{title || 'Untitled'}</span>
            <span className="text-[11px] text-gray-400 opacity-60">✎</span>
          </div>
        )}
      </div>

      {/* Right Window Controls (iOS Spring Physics Micro-interactions) */}
      <div className="flex items-center gap-2 no-drag">
        {/* Minimize Button */}
        <button
          onClick={onMinimize}
          className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/15 text-gray-300 hover:text-white hover:scale-110 active:scale-90 transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer border border-transparent hover:border-white/10"
          title="Minimize window"
        >
          <div className="w-4 h-[2px] bg-gray-300 rounded-full"></div>
        </button>

        {/* Minitab / Fullscreen Tab Button */}
        <button
          onClick={onMinitab}
          className={`w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/15 hover:scale-110 active:scale-90 transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer border border-transparent hover:border-white/10 ${
            isMinitab ? 'bg-white/20 border-white/20' : ''
          }`}
          title={isMinitab ? 'Restore normal window' : 'Fullscreen / Minitab mode'}
        >
          <img
            src="./icons/SquareTool.png"
            alt="Fullscreen / Minitab"
            className="w-4 h-4 object-contain"
          />
        </button>

        {/* Exit Button */}
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-red-500/80 hover:scale-110 active:scale-90 transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer group border border-transparent hover:border-red-400/50"
          title="Exit Blackboard"
        >
          <img
            src="./icons/Xbutton.png"
            alt="Exit"
            className="w-4 h-4 object-contain invert opacity-80 group-hover:opacity-100 transition"
          />
        </button>
      </div>
    </div>
  );
}
