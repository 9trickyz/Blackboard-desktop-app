import React from 'react';

export default function TextPopover({
  isOpen,
  onClose,
  textColor,
  onOpenColorWheel,
  fontSize,
  onChangeFontSize,
  isItalic,
  onToggleItalic,
  isBold,
  onToggleBold,
  isStrikethrough,
  onToggleStrikethrough,
  textAlign = 'left',
  onChangeAlign
}) {
  if (!isOpen) return null;

  return (
    <div className="absolute top-[68px] left-[52%] -translate-x-1/2 z-40 animate-popover">
      <div className="calm-tile rounded-xl p-3 flex flex-col gap-1.5 shadow-xl border border-white/[0.06] min-w-[190px]">
        
        {/* Color Wheel Option */}
        <div
          onClick={onOpenColorWheel}
          className="group flex items-center gap-3 p-1.5 rounded-md hover:bg-white/[0.06] cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] text-xs font-semibold text-gray-200"
          title="Choose Text Color"
        >
          <div
            className="w-4 h-4 rounded-full border border-white/70 shadow-sm flex-shrink-0 group-hover:scale-110 transition-transform duration-200"
            style={{ backgroundColor: textColor || '#ffffff' }}
          />
          <span>Color wheel</span>
        </div>

        {/* Font Size Option */}
        <div className="flex items-center justify-between p-1.5 rounded-md hover:bg-white/[0.06] transition text-xs font-semibold text-gray-200">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="8"
              max="120"
              value={fontSize}
              onChange={(e) => onChangeFontSize(Math.max(8, Math.min(120, parseInt(e.target.value) || 12)))}
              className="w-9 px-1 py-0.5 rounded bg-black/60 border border-white/[0.08] text-center font-bold text-white text-xs outline-none"
            />
            <span>Font size</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => onChangeFontSize(Math.min(120, fontSize + 2))}
              className="text-[10px] text-gray-400 hover:text-white leading-none px-1 rounded cursor-pointer hover:scale-110 active:scale-90 transition-transform"
            >
              ▲
            </button>
            <button
              onClick={() => onChangeFontSize(Math.max(8, fontSize - 2))}
              className="text-[10px] text-gray-400 hover:text-white leading-none px-1 rounded cursor-pointer hover:scale-110 active:scale-90 transition-transform"
            >
              ▼
            </button>
          </div>
        </div>

        {/* Alignment Segmented Control */}
        <div className="flex items-center justify-between p-1.5 rounded-md hover:bg-white/[0.06] transition text-xs font-semibold text-gray-200">
          <span>Alignment</span>
          <div className="flex items-center gap-0.5 bg-black/60 p-0.5 rounded border border-white/[0.08]">
            <button
              onClick={() => onChangeAlign && onChangeAlign('left')}
              className={`p-1 rounded cursor-pointer transition ${
                textAlign === 'left' ? 'bg-white/20 text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
              title="Align Left"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 4h18v2H3V4zm0 5h12v2H3V9zm0 5h18v2H3v-2zm0 5h12v2H3v-2z" />
              </svg>
            </button>
            <button
              onClick={() => onChangeAlign && onChangeAlign('center')}
              className={`p-1 rounded cursor-pointer transition ${
                textAlign === 'center' ? 'bg-white/20 text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
              title="Align Center / Middle"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 4h18v2H3V4zm3 5h12v2H6V9zm-3 5h18v2H3v-2zm3 5h12v2H6v-2z" />
              </svg>
            </button>
            <button
              onClick={() => onChangeAlign && onChangeAlign('right')}
              className={`p-1 rounded cursor-pointer transition ${
                textAlign === 'right' ? 'bg-white/20 text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
              title="Align Right"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 4h18v2H3V4zm6 5h12v2H9V9zm-6 5h18v2H3v-2zm6 5h12v2H9v-2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Italics Toggle */}
        <div
          onClick={onToggleItalic}
          className={`flex items-center gap-3 p-1.5 rounded-md cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] text-xs font-medium ${
            isItalic ? 'bg-white/[0.14] text-white border border-white/[0.12] shadow-sm' : 'hover:bg-white/[0.06] text-gray-300 border border-transparent'
          }`}
          title="Toggle Italics"
        >
          <img
            src={isItalic ? './icons/ItalicIconFILL.png' : './icons/ItalicIcon.png'}
            alt="Italics"
            className="w-4 h-4 object-contain"
          />
          <span>italics {isItalic ? '(SELECTED)' : ''}</span>
        </div>

        {/* Bold Toggle */}
        <div
          onClick={onToggleBold}
          className={`flex items-center gap-3 p-1.5 rounded-md cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] text-xs font-medium ${
            isBold ? 'bg-white/[0.14] text-white border border-white/[0.12] shadow-sm' : 'hover:bg-white/[0.06] text-gray-300 border border-transparent'
          }`}
          title="Toggle Bold"
        >
          <img
            src={isBold ? './icons/BoldIconFILL.png' : './icons/BoldIcon.png'}
            alt="Bold"
            className="w-4 h-4 object-contain"
          />
          <span>Bold {isBold ? '(SELECTED)' : ''}</span>
        </div>

        {/* Strikethrough Toggle */}
        <div
          onClick={onToggleStrikethrough}
          className={`flex items-center gap-3 p-1.5 rounded-md cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] text-xs font-medium ${
            isStrikethrough ? 'bg-white/[0.14] text-white border border-white/[0.12] shadow-sm' : 'hover:bg-white/[0.06] text-gray-300 border border-transparent'
          }`}
          title="Toggle Strikethrough"
        >
          <img
            src={isStrikethrough ? './icons/StrikethroughIconFILL.png' : './icons/StrikethroughIcon.png'}
            alt="Strikethrough"
            className="w-4 h-4 object-contain"
          />
          <span>strikethrough {isStrikethrough ? '(SELECTED)' : ''}</span>
        </div>

      </div>
    </div>
  );
}
