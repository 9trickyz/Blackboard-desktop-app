import React from 'react';

export default function FloatingDock({
  // Left Dock Props
  isLeftHidden,
  onToggleLeftHidden,
  onOpenFile,
  onNewFile,
  onOpenSettings,

  // Center Dock Props
  isCenterHidden,
  onToggleCenterHidden,
  mode, // 'view' | 'edit'
  onToggleMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  activeTool, // 'select' | 'pen' | 'shape' | 'image' | 'text' | 'line'
  onSelectTool,
  pattern, // 'blank' | 'grid' | 'dotted'
  onCyclePattern,
  onTriggerImageUpload,

  // Right Dock Props
  isRightHidden,
  onToggleRightHidden,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetZoom
}) {
  return (
    <div className="absolute top-10 left-0 right-0 flex items-start justify-between px-6 pointer-events-none z-20">
      
      {/* 1. Left Dock */}
      <div className="flex flex-col items-center pointer-events-auto transition-transform duration-200">
        {!isLeftHidden ? (
          <>
            <div className="calm-tile rounded-2xl px-3 py-1.5 flex items-center gap-1.5 shadow-lg">
              {/* Open Folder */}
              <button
                onClick={onOpenFile}
                className="calm-tool-btn w-9 h-9 rounded-lg flex items-center justify-center text-gray-300 hover:text-white"
                title="Open Blackboard Document"
              >
                <img src="./icons/FolderIcon.png" alt="Folder" className="w-5 h-5 object-contain" />
              </button>

              {/* New File */}
              <button
                onClick={onNewFile}
                className="calm-tool-btn w-9 h-9 rounded-lg flex items-center justify-center text-gray-300 hover:text-white"
                title="New Blackboard"
              >
                <img src="./icons/FileTool.png" alt="New File" className="w-5 h-5 object-contain" />
              </button>

              {/* Settings */}
              <button
                onClick={onOpenSettings}
                className="calm-tool-btn w-9 h-9 rounded-lg flex items-center justify-center text-gray-300 hover:text-white"
                title="Open Settings"
              >
                <img src="./icons/SetingsTool.png" alt="Settings" className="w-5 h-5 object-contain" />
              </button>
            </div>

            {/* Minimize Tile Button - Located & Centered Just Below the Tile */}
            <button
              onClick={onToggleLeftHidden}
              className="calm-pull-tab -mt-[1px] px-5 py-1 rounded-b-xl flex items-center justify-center group"
              title="Minimize Tile"
            >
              <img
                src="./icons/arrowUp.png"
                alt="Minimize"
                className="w-3 h-3 object-contain opacity-70 group-hover:opacity-100 transition"
              />
            </button>
          </>
        ) : (
          <button
            onClick={onToggleLeftHidden}
            className="calm-pull-tab px-5 py-1.5 rounded-b-xl flex items-center justify-center group"
            title="Show left dock"
          >
            <img
              src="./icons/Arrowdown.png"
              alt="Expand"
              className="w-3.5 h-3.5 object-contain opacity-80 group-hover:opacity-100 transition"
            />
          </button>
        )}
      </div>

      {/* 2. Center Dock (Minimize button located & centered just below the tile) */}
      <div className="flex flex-col items-center pointer-events-auto transition-transform duration-200">
        {!isCenterHidden ? (
          <>
            <div className="calm-tile rounded-2xl px-3.5 py-1.5 flex items-center gap-1.5 shadow-lg">
              
              {/* Mode Toggle: View mode vs Edit mode */}
              <button
                onClick={onToggleMode}
                className={`calm-tool-btn w-9 h-9 rounded-lg flex items-center justify-center ${
                  mode === 'edit' ? 'active' : ''
                }`}
                title={mode === 'edit' ? 'Edit Mode (Click for View Mode)' : 'View Mode (Click for Edit Mode)'}
              >
                <img
                  src={mode === 'edit' ? './icons/EditTool.png' : './icons/ViewIcon.png'}
                  alt={mode}
                  className="w-5 h-5 object-contain"
                />
              </button>

              {/* Thin Vertical Divider */}
              <div className="w-[1px] h-6 bg-white/20 mx-1" />

              {/* Undo */}
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className={`calm-tool-btn w-9 h-9 rounded-lg flex items-center justify-center ${
                  canUndo ? 'text-gray-300 hover:text-white' : 'opacity-25 cursor-not-allowed'
                }`}
                title="Undo (Ctrl+Z)"
              >
                <img src="./icons/UndoTool.png" alt="Undo" className="w-5 h-5 object-contain" />
              </button>

              {/* Redo */}
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className={`calm-tool-btn w-9 h-9 rounded-lg flex items-center justify-center ${
                  canRedo ? 'text-gray-300 hover:text-white' : 'opacity-25 cursor-not-allowed'
                }`}
                title="Redo (Ctrl+Y)"
              >
                <img src="./icons/RedoTool.png" alt="Redo" className="w-5 h-5 object-contain" />
              </button>

              {/* Thin Vertical Divider */}
              <div className="w-[1px] h-6 bg-white/20 mx-1" />

              {/* Select Tool */}
              <button
                onClick={() => onSelectTool('select')}
                className={`calm-tool-btn w-9 h-9 rounded-lg flex items-center justify-center ${
                  activeTool === 'select' ? 'active' : ''
                }`}
                title="Select Tool (Hold & drag to square select)"
              >
                <img src="./icons/SelectTool.png" alt="Select" className="w-5 h-5 object-contain" />
              </button>

              {/* Pen Tool */}
              <button
                onClick={() => onSelectTool('pen')}
                className={`calm-tool-btn w-9 h-9 rounded-lg flex items-center justify-center ${
                  activeTool === 'pen' ? 'active' : ''
                }`}
                title="Pen Tool (Ink & Auto-Shape)"
              >
                <img src="./icons/PenTool.png" alt="Pen" className="w-5 h-5 object-contain" />
              </button>

              {/* Shape Tool */}
              <button
                onClick={() => onSelectTool('shape')}
                className={`calm-tool-btn w-9 h-9 rounded-lg flex items-center justify-center ${
                  activeTool === 'shape' ? 'active' : ''
                }`}
                title="Shape Tool"
              >
                <img src="./icons/ShapeTool.png" alt="Shape" className="w-5 h-5 object-contain" />
              </button>

              {/* Image Tool */}
              <button
                onClick={onTriggerImageUpload}
                className={`calm-tool-btn w-9 h-9 rounded-lg flex items-center justify-center ${
                  activeTool === 'image' ? 'active' : ''
                }`}
                title="Insert Image"
              >
                <img src="./icons/ImageTool.png" alt="Image" className="w-5 h-5 object-contain" />
              </button>

              {/* Text Tool */}
              <button
                onClick={() => onSelectTool('text')}
                className={`calm-tool-btn w-9 h-9 rounded-lg flex items-center justify-center ${
                  activeTool === 'text' ? 'active' : ''
                }`}
                title="Text Tool"
              >
                <img src="./icons/TextTool.png" alt="Text" className="w-5 h-5 object-contain" />
              </button>

              {/* Line Tool */}
              <button
                onClick={() => onSelectTool('line')}
                className={`calm-tool-btn w-9 h-9 rounded-lg flex items-center justify-center ${
                  activeTool === 'line' ? 'active' : ''
                }`}
                title="Line & Arrow Tool"
              >
                <img src="./icons/LineTool.png" alt="Line" className="w-5 h-5 object-contain" />
              </button>

              {/* Thin Vertical Divider */}
              <div className="w-[1px] h-6 bg-white/20 mx-1" />

              {/* Pattern Background Toggle: Blank -> Grid -> Dotted */}
              <button
                onClick={onCyclePattern}
                className="calm-tool-btn w-9 h-9 rounded-lg flex items-center justify-center text-gray-300 hover:text-white"
                title={`Pattern: ${pattern} (Click to cycle)`}
              >
                <img
                  src={
                    pattern === 'grid'
                      ? './icons/GridTool.png'
                      : pattern === 'dotted'
                      ? './icons/dottedTool.png'
                      : './icons/SquareTool.png'
                  }
                  alt="Pattern background"
                  className="w-5 h-5 object-contain"
                />
              </button>

            </div>

            {/* Minimize Tile Button - Located & Centered Just Below the Tile */}
            <button
              onClick={onToggleCenterHidden}
              className="calm-pull-tab -mt-[1px] px-7 py-1 rounded-b-xl flex items-center justify-center group"
              title="Minimize Tile"
            >
              <img
                src="./icons/arrowUp.png"
                alt="Minimize"
                className="w-3 h-3 object-contain opacity-70 group-hover:opacity-100 transition"
              />
            </button>
          </>
        ) : (
          <button
            onClick={onToggleCenterHidden}
            className="calm-pull-tab px-7 py-1.5 rounded-b-xl flex items-center justify-center group"
            title="Show toolbar"
          >
            <img
              src="./icons/Arrowdown.png"
              alt="Expand"
              className="w-3.5 h-3.5 object-contain opacity-80 group-hover:opacity-100 transition"
            />
          </button>
        )}
      </div>

      {/* 3. Right Dock (Zoom Controls: [-] | 100% | [+], Minimize centered below) */}
      <div className="flex flex-col items-center pointer-events-auto transition-transform duration-200">
        {!isRightHidden ? (
          <>
            <div className="calm-tile rounded-2xl px-3 py-1.5 flex items-center gap-1.5 shadow-lg">
              
              {/* Decrease Zoom */}
              <button
                onClick={onZoomOut}
                className="calm-tool-btn w-9 h-9 rounded-lg flex items-center justify-center text-gray-300 hover:text-white"
                title="Zoom Out"
              >
                <img src="./icons/MinusIcon.png" alt="Decrease" className="w-4 h-4 object-contain" />
              </button>

              {/* Vertical Divider */}
              <div className="w-[1px] h-6 bg-white/20 mx-1" />

              {/* Zoom Percentage */}
              <button
                onClick={onResetZoom}
                className="calm-tool-btn px-2.5 py-1 rounded-lg text-xs font-bold text-gray-200 hover:text-white font-mono"
                title="Reset zoom to 100%"
              >
                {Math.round(zoomLevel * 100)}%
              </button>

              {/* Vertical Divider */}
              <div className="w-[1px] h-6 bg-white/20 mx-1" />

              {/* Increase Zoom */}
              <button
                onClick={onZoomIn}
                className="calm-tool-btn w-9 h-9 rounded-lg flex items-center justify-center text-gray-300 hover:text-white"
                title="Zoom In"
              >
                <img src="./icons/PlusIcon.png" alt="Increase" className="w-4 h-4 object-contain" />
              </button>

            </div>

            {/* Minimize Tile Button - Located & Centered Just Below the Tile */}
            <button
              onClick={onToggleRightHidden}
              className="calm-pull-tab -mt-[1px] px-5 py-1 rounded-b-xl flex items-center justify-center group"
              title="Minimize Tile"
            >
              <img
                src="./icons/arrowUp.png"
                alt="Minimize"
                className="w-3 h-3 object-contain opacity-70 group-hover:opacity-100 transition"
              />
            </button>
          </>
        ) : (
          <button
            onClick={onToggleRightHidden}
            className="calm-pull-tab px-5 py-1.5 rounded-b-xl flex items-center justify-center group"
            title="Show zoom dock"
          >
            <img
              src="./icons/Arrowdown.png"
              alt="Expand"
              className="w-3.5 h-3.5 object-contain opacity-80 group-hover:opacity-100 transition"
            />
          </button>
        )}
      </div>

    </div>
  );
}
