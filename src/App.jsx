import React, { useState, useEffect, useRef, useCallback } from 'react';
import TitleBar from './components/TitleBar';
import FloatingDock from './components/FloatingDock';
import BlackboardCanvas from './components/BlackboardCanvas';
import TextPopover from './components/Popovers/TextPopover';
import ShapePopover from './components/Popovers/ShapePopover';
import PenPopover from './components/Popovers/PenPopover';
import ColorWheelModal from './components/ColorWheelModal';
import SettingsModal from './components/SettingsModal';
import SavePromptModal from './components/SavePromptModal';
import { exportBoard, hydrateElements } from './utils/exporter';
import {
  loadSettings,
  saveSettings,
  saveCurrentBoard,
  clearCurrentBoard,
  loadCurrentBoard,
  createMilestoneSnapshot,
  sanitizeElementsForSave
} from './utils/storage';

export default function App() {
  // Board & Title State
  const [title, setTitle] = useState('Untitled');
  const [elements, setElements] = useState([]);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  // Unsaved Changes Tracking & Close Confirmation
  const [isDirty, setIsDirty] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  // Synchronized refs to prevent stale closures in window event handlers
  const elementsRef = useRef(elements);
  const titleRef = useRef(title);
  const patternRef = useRef('blank');
  const isDirtyRef = useRef(false);
  const isInitialMount = useRef(true);
  const isDiscardingRef = useRef(false);
  const hasSavedToFileRef = useRef(false);

  // Settings State
  const [settings, setSettings] = useState(loadSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // App & Window Mode
  const [isMinitab, setIsMinitab] = useState(false);
  const [mode, setMode] = useState('edit'); // 'view' | 'edit'
  const [activeTool, setActiveTool] = useState('pen'); // 'select' | 'pen' | 'shape' | 'image' | 'text' | 'line'
  const [pattern, setPattern] = useState('blank'); // 'blank' | 'grid' | 'dotted'
  const [zoomLevel, setZoomLevel] = useState(1);

  // Tile Visibility ("Hide Tile" feature)
  const [isLeftHidden, setIsLeftHidden] = useState(false);
  const [isCenterHidden, setIsCenterHidden] = useState(false);
  const [isRightHidden, setIsRightHidden] = useState(false);

  // Tool Specific Properties
  const [currentShape, setCurrentShape] = useState('rectangle');
  const [strokeColor, setStrokeColor] = useState('#ffffff');
  const [strokeWeight, setStrokeWeight] = useState(12);
  const [transparency, setTransparency] = useState(100);

  const [textColor, setTextColor] = useState('#ffffff');
  const [fontSize, setFontSize] = useState(12);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [textAlign, setTextAlign] = useState('left'); // 'left' | 'center' | 'right'

  // Popover State
  const [openPopover, setOpenPopover] = useState(null);
  const [isColorWheelOpen, setIsColorWheelOpen] = useState(false);
  const [colorWheelTarget, setColorWheelTarget] = useState('stroke');

  const fileInputRef = useRef(null);
  const imageUploadRef = useRef(null);

  // Sync ref values and dirty state
  useEffect(() => {
    elementsRef.current = elements;
    if (isInitialMount.current) return;
    setIsDirty(true);
    isDirtyRef.current = true;
  }, [elements]);

  useEffect(() => {
    titleRef.current = title;
    if (!isInitialMount.current) {
      setIsDirty(true);
      isDirtyRef.current = true;
    }
  }, [title]);

  useEffect(() => {
    patternRef.current = pattern;
    if (!isInitialMount.current) {
      setIsDirty(true);
      isDirtyRef.current = true;
    }
  }, [pattern]);

  // Load Board from string content or parsed JSON
  const loadBoardFromContent = useCallback((content, sourcePath) => {
    try {
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;
      if (parsed && Array.isArray(parsed.elements)) {
        setHistory(prev => [...prev.slice(-30), elementsRef.current]);
        setFuture([]);
        const hydrated = hydrateElements(parsed.elements);
        setElements(hydrated);

        let boardTitle = parsed.title;
        if ((!boardTitle || boardTitle === 'Untitled') && sourcePath) {
          const base = sourcePath.split(/[\\/]/).pop();
          boardTitle = base.replace(/\.(blackboard|json)$/i, '');
        }
        setTitle(boardTitle || 'Untitled');
        setPattern(parsed.pattern || 'blank');
        setIsDirty(false);
        isDirtyRef.current = false;
        hasSavedToFileRef.current = true;

        saveCurrentBoard({
          title: boardTitle || 'Untitled',
          elements: parsed.elements,
          pattern: parsed.pattern || 'blank',
          isDirty: false
        });
        return true;
      }
    } catch (err) {
      console.error('Failed to parse blackboard file:', err);
      alert('Could not open file: invalid blackboard format');
    }
    return false;
  }, []);

  // Load initial board or crash / shutdown draft from offline cache
  useEffect(() => {
    // Ensure sit on top feature is automatically OFF when opening the app
    if (window.electronAPI && window.electronAPI.setAlwaysOnTop) {
      window.electronAPI.setAlwaysOnTop(false);
    }

    const saved = loadCurrentBoard();
    if (saved && saved.elements && saved.elements.length > 0) {
      setElements(hydrateElements(saved.elements));
      if (saved.title) setTitle(saved.title);
      if (saved.pattern) setPattern(saved.pattern);
      // Draft restored from cache: mark dirty and unsaved to disk so closing prompts "save changes"
      setIsDirty(true);
      isDirtyRef.current = true;
      hasSavedToFileRef.current = false;
    } else {
      setElements([]);
      setTitle('Untitled');
      setPattern('blank');
      setIsDirty(false);
      isDirtyRef.current = false;
      hasSavedToFileRef.current = false;
      clearCurrentBoard();
    }
    const timer = setTimeout(() => {
      isInitialMount.current = false;
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Listen to direct file opening from Windows Explorer (double clicking .blackboard file)
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.getInitialFile) {
      window.electronAPI.getInitialFile().then(fileData => {
        if (fileData && fileData.content) {
          loadBoardFromContent(fileData.content, fileData.filePath || fileData.fileName);
        }
      });
    }

    if (window.electronAPI && window.electronAPI.onFileOpened) {
      window.electronAPI.onFileOpened(fileData => {
        if (fileData && fileData.content) {
          loadBoardFromContent(fileData.content, fileData.filePath || fileData.fileName);
        }
      });
    }
  }, []);

  // Listen to Electron Minitab events
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onMinitabChanged) {
      window.electronAPI.onMinitabChanged((state) => {
        setIsMinitab(state);
      });
    }
  }, []);

  // Continuous live draft saving: persists after every change so crash or sudden PC shutdown never loses work
  useEffect(() => {
    if (isDiscardingRef.current) return;
    const timer = setTimeout(() => {
      if (isDiscardingRef.current) return;
      if (elements.length > 0) {
        saveCurrentBoard({
          title,
          elements,
          pattern,
          isDirty: isDirtyRef.current,
          timestamp: Date.now()
        });
      } else {
        // Elements were deleted / empty: wipe draft from storage so reopening won't bring it back
        clearCurrentBoard();
        setIsDirty(false);
        isDirtyRef.current = false;
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [title, elements, pattern]);

  // Emergency draft flush on beforeunload / pagehide (crash & PC shutdown resilience)
  useEffect(() => {
    const handleEmergencyFlush = () => {
      if (isDiscardingRef.current) return;
      const curElements = elementsRef.current;
      const curTitle = titleRef.current;
      const curPattern = patternRef.current;
      if (curElements.length > 0) {
        saveCurrentBoard({
          title: curTitle,
          elements: curElements,
          pattern: curPattern,
          isDirty: isDirtyRef.current,
          timestamp: Date.now()
        });
        createMilestoneSnapshot(
          { title: curTitle, elements: curElements, pattern: curPattern },
          'Crash / Shutdown Draft'
        );
      } else {
        clearCurrentBoard();
      }
    };

    window.addEventListener('beforeunload', handleEmergencyFlush);
    window.addEventListener('pagehide', handleEmergencyFlush);
    return () => {
      window.removeEventListener('beforeunload', handleEmergencyFlush);
      window.removeEventListener('pagehide', handleEmergencyFlush);
    };
  }, []);

  // Periodic Milestone Snapshots (Hourly)
  useEffect(() => {
    if (settings.versionHistory?.milestoneSnapshots) {
      const hourly = setInterval(() => {
        if (elementsRef.current.length > 0) {
          createMilestoneSnapshot(
            { title: titleRef.current, elements: elementsRef.current, pattern: patternRef.current },
            'Hourly snapshot'
          );
        }
      }, 3600000);

      return () => clearInterval(hourly);
    }
  }, [settings.versionHistory?.milestoneSnapshots]);

  // File Save Helper (.blackboard file)
  const saveBoardToFile = async () => {
    const curElements = elementsRef.current;
    const curTitle = titleRef.current;
    const curPattern = patternRef.current;

    const boardData = {
      version: 1,
      title: curTitle,
      pattern: curPattern,
      elements: sanitizeElementsForSave(curElements),
      savedAt: new Date().toISOString()
    };
    const content = JSON.stringify(boardData, null, 2);
    const cleanTitle = (curTitle || 'Untitled').replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'Untitled';
    const suggestedName = `${cleanTitle}.blackboard`;

    if (window.electronAPI && window.electronAPI.saveFile) {
      const res = await window.electronAPI.saveFile({
        content,
        suggestedName,
        filters: [
          { name: 'Blackboard Document (*.blackboard)', extensions: ['blackboard', 'json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (res && res.success) {
        setIsDirty(false);
        isDirtyRef.current = false;
        hasSavedToFileRef.current = true;
        saveCurrentBoard({
          title: curTitle,
          elements: sanitizeElementsForSave(curElements),
          pattern: curPattern,
          isDirty: false
        });
        return true;
      }
      return false; // User cancelled save dialog
    } else {
      // Browser fallback
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = suggestedName;
      a.click();
      URL.revokeObjectURL(url);
      setIsDirty(false);
      isDirtyRef.current = false;
      hasSavedToFileRef.current = true;
      saveCurrentBoard({
        title: curTitle,
        elements: curElements,
        pattern: curPattern,
        isDirty: false
      });
      return true;
    }
  };

  // Close Handling Logic
  const forceExitApp = () => {
    if (window.electronAPI && window.electronAPI.confirmClose) {
      window.electronAPI.confirmClose();
    } else if (window.electronAPI && window.electronAPI.close) {
      window.electronAPI.close();
    } else {
      window.close();
    }
  };

  const handleRequestClose = useCallback(() => {
    // If board is empty (or draft was deleted), ensure storage is clean and exit immediately without prompt
    if (elementsRef.current.length === 0) {
      clearCurrentBoard();
      forceExitApp();
      return;
    }

    // Prompt to save changes if there are unsaved elements on the board
    const hasUnsavedProgress = isDirtyRef.current || !hasSavedToFileRef.current;
    if (hasUnsavedProgress) {
      setShowCloseModal(true);
    } else {
      forceExitApp();
    }
  }, []);

  const handleSaveAndClose = async () => {
    const saved = await saveBoardToFile();
    if (saved) {
      setShowCloseModal(false);
      forceExitApp();
    }
  };

  const handleDiscardAndClose = () => {
    // Explicit discard: mark flag to prevent emergency beforeunload save, wipe storage
    isDiscardingRef.current = true;
    elementsRef.current = [];
    titleRef.current = 'Untitled';
    patternRef.current = 'blank';
    isDirtyRef.current = false;
    clearCurrentBoard();
    setElements([]);
    setTitle('Untitled');
    setPattern('blank');
    setIsDirty(false);
    setShowCloseModal(false);
    forceExitApp();
  };

  const handleCancelClose = () => {
    setShowCloseModal(false);
  };

  // Listen to close requests from Electron (Alt+F4, system tray, or native titlebar close)
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onAppCloseRequested) {
      window.electronAPI.onAppCloseRequested(() => {
        handleRequestClose();
      });
    }
  }, [handleRequestClose]);

  // Keyboard Shortcuts (Undo/Redo, Save, Tools)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveBoardToFile();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        const activeTag = document.activeElement?.tagName;
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
          if (window.electronAPI && window.electronAPI.readClipboardImage) {
            window.electronAPI.readClipboardImage().then(dataUrl => {
              if (dataUrl && dataUrl.startsWith('data:image/')) {
                if (Date.now() - lastPasteTimeRef.current > 300) {
                  lastPasteTimeRef.current = Date.now();
                  insertImageFromDataUrl(dataUrl);
                }
              }
            });
          }
        }
      } else if (e.key === 'v' || e.key === 'V') {
        setMode(prev => prev === 'view' ? 'edit' : 'view');
      } else if (e.key === 'Escape') {
        if (showCloseModal) {
          setShowCloseModal(false);
        } else {
          setOpenPopover(null);
          setIsColorWheelOpen(false);
          setIsSettingsOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [elements, history, future, showCloseModal]);

  // History Management
  const pushHistory = useCallback(() => {
    setHistory(prev => [...prev.slice(-30), elements]);
    setFuture([]);
  }, [elements]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setFuture(prev => [elements, ...prev]);
    setElements(previous);
    setHistory(prev => prev.slice(0, prev.length - 1));
  }, [history, elements]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory(prev => [...prev, elements]);
    setElements(next);
    setFuture(prev => prev.slice(1));
  }, [future, elements]);

  // Tool Selection & Popover toggle
  const handleSelectTool = (tool) => {
    if (activeTool === tool) {
      // Toggle popover on second click
      if (tool === 'text') setOpenPopover(prev => prev === 'text' ? null : 'text');
      else if (tool === 'shape') setOpenPopover(prev => prev === 'shape' ? null : 'shape');
      else if (tool === 'pen' || tool === 'line') setOpenPopover(prev => prev === 'pen' ? null : 'pen');
    } else {
      setActiveTool(tool);
      // Auto open relevant popover
      if (tool === 'text') setOpenPopover('text');
      else if (tool === 'shape') setOpenPopover('shape');
      else if (tool === 'pen' || tool === 'line') setOpenPopover('pen');
      else setOpenPopover(null);
    }
    // Automatically switch to edit mode when a drawing tool is selected
    if (mode === 'view' && tool !== 'select') {
      setMode('edit');
    }
  };

  // Pattern Background Cycling: Blank -> Grid -> Dotted
  const handleCyclePattern = () => {
    setPattern(prev => {
      if (prev === 'blank') return 'grid';
      if (prev === 'grid') return 'dotted';
      return 'blank';
    });
  };

  // Zoom controls
  const handleZoomIn = () => setZoomLevel(prev => Math.min(5, +(prev + 0.1).toFixed(2)));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(0.1, +(prev - 0.1).toFixed(2)));
  const handleResetZoom = () => setZoomLevel(1);

  // New File
  const handleNewFile = () => {
    if (elements.length > 0 && isDirty) {
      if (window.confirm('Create new blackboard? Unsaved changes will be cleared.')) {
        pushHistory();
        setElements([]);
        setTitle('Untitled');
        setPattern('blank');
        setIsDirty(false);
        isDirtyRef.current = false;
        hasSavedToFileRef.current = false;
        clearCurrentBoard();
      }
    } else {
      pushHistory();
      setElements([]);
      setTitle('Untitled');
      setPattern('blank');
      setIsDirty(false);
      isDirtyRef.current = false;
      hasSavedToFileRef.current = false;
      clearCurrentBoard();
    }
  };

  // Open / Import Board
  const handleOpenFile = async () => {
    if (window.electronAPI && window.electronAPI.openFile) {
      const res = await window.electronAPI.openFile();
      if (res && res.success && res.content) {
        loadBoardFromContent(res.content, res.filePath);
      }
    } else {
      fileInputRef.current && fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        loadBoardFromContent(event.target.result, file.name);
      };
      reader.readAsText(file);
    }
  };

  // Helper to insert an image into the board (used by Upload, Drag-and-Drop, and Automatic Clipboard Paste)
  const insertImageFromDataUrl = useCallback((dataUrl, initialPos) => {
    if (!dataUrl) return;
    const img = new Image();
    img.onload = () => {
      const maxDim = 500;
      let w = img.width || 400;
      let h = img.height || 300;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = (h / w) * maxDim;
          w = maxDim;
        } else {
          w = (w / h) * maxDim;
          h = maxDim;
        }
      }

      let posX = initialPos?.x;
      let posY = initialPos?.y;
      if (posX === undefined || posY === undefined) {
        const vw = window.innerWidth || 1200;
        const vh = window.innerHeight || 800;
        posX = Math.max(40, Math.round((vw - w) / 2));
        posY = Math.max(60, Math.round((vh - h) / 2));
      }

      const newImgEl = {
        id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        type: 'image',
        src: dataUrl,
        imgElement: img,
        x: posX,
        y: posY,
        width: Math.round(w),
        height: Math.round(h),
        opacity: 100
      };

      pushHistory();
      setElements(prev => [...prev, newImgEl]);
      setActiveTool('select');
      setIsDirty(true);
      isDirtyRef.current = true;
    };
    img.src = dataUrl;
  }, [pushHistory]);

  const insertImageFromFile = useCallback((file, initialPos) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      insertImageFromDataUrl(event.target.result, initialPos);
    };
    reader.readAsDataURL(file);
  }, [insertImageFromDataUrl]);

  // Automatic Clipboard Image Paste (Ctrl+V / Cmd+V / System Paste)
  const lastPasteTimeRef = useRef(0);
  useEffect(() => {
    const processClipboardData = async (e) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      const clipboardData = e.clipboardData || window.clipboardData;
      let handledImage = false;

      if (clipboardData) {
        // 1. Check clipboard items for image blobs (e.g. Snipping tool, screenshots, browser copied image)
        if (clipboardData.items) {
          for (let i = 0; i < clipboardData.items.length; i++) {
            const item = clipboardData.items[i];
            if (item.type && item.type.startsWith('image/')) {
              const file = item.getAsFile();
              if (file) {
                e.preventDefault();
                lastPasteTimeRef.current = Date.now();
                insertImageFromFile(file);
                handledImage = true;
                break;
              }
            }
          }
        }

        // 2. Check clipboard files (e.g. copied image file from file explorer)
        if (!handledImage && clipboardData.files && clipboardData.files.length > 0) {
          for (let i = 0; i < clipboardData.files.length; i++) {
            const file = clipboardData.files[i];
            if (file.type && file.type.startsWith('image/')) {
              e.preventDefault();
              lastPasteTimeRef.current = Date.now();
              insertImageFromFile(file);
              handledImage = true;
              break;
            }
          }
        }
      }

      // 3. Fallback to native Electron clipboard image if DOM clipboard doesn't contain image
      if (!handledImage && !isInput && window.electronAPI && window.electronAPI.readClipboardImage) {
        try {
          const dataUrl = await window.electronAPI.readClipboardImage();
          if (dataUrl && dataUrl.startsWith('data:image/')) {
            if (Date.now() - lastPasteTimeRef.current > 300) {
              e.preventDefault();
              lastPasteTimeRef.current = Date.now();
              insertImageFromDataUrl(dataUrl);
              handledImage = true;
            }
          }
        } catch (err) {
          console.error('Failed to read native clipboard image:', err);
        }
      }
    };

    window.addEventListener('paste', processClipboardData);
    return () => window.removeEventListener('paste', processClipboardData);
  }, [insertImageFromFile, insertImageFromDataUrl]);

  // Image Upload Tool
  const handleTriggerImageUpload = () => {
    imageUploadRef.current && imageUploadRef.current.click();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      insertImageFromFile(file);
      e.target.value = '';
    }
  };

  // Color Wheel Trigger
  const handleOpenColorWheel = (targetType) => {
    setColorWheelTarget(targetType);
    setIsColorWheelOpen(true);
  };

  const handleColorSelected = (colorHex) => {
    if (colorWheelTarget === 'stroke') {
      setStrokeColor(colorHex);
    } else {
      setTextColor(colorHex);
    }
  };

  // Quick Export (from Settings or elsewhere)
  const handleQuickExport = () => {
    exportBoard({
      elements,
      exportSettings: settings.export,
      viewTransform: { x: 0, y: 0, scale: zoomLevel },
      canvasDimensions: { width: window.innerWidth, height: window.innerHeight },
      title
    });
  };

  // Update Settings
  const handleUpdateSettings = (newSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // Window Controls
  const handleMinimize = () => {
    if (window.electronAPI && window.electronAPI.minimize) {
      window.electronAPI.minimize();
    }
  };

  const handleMinitab = () => {
    if (window.electronAPI && window.electronAPI.minitab) {
      window.electronAPI.minitab();
    } else {
      setIsMinitab(!isMinitab);
    }
  };

  // Drag and Drop files (.blackboard documents or image files)
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer && e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.blackboard') || fileName.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        loadBoardFromContent(event.target.result, file.name);
      };
      reader.readAsText(file);
    } else if (file.type.startsWith('image/')) {
      insertImageFromFile(file, { x: e.clientX, y: e.clientY });
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative w-screen h-screen flex flex-col overflow-hidden rounded-xl glossy-blackboard-bg"
    >
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".blackboard,.json"
        className="hidden"
        onChange={handleFileInputChange}
      />
      <input
        ref={imageUploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Top Title Bar */}
      <TitleBar
        title={title}
        onChangeTitle={setTitle}
        isMinitab={isMinitab}
        onMinimize={handleMinimize}
        onMinitab={handleMinitab}
        onClose={handleRequestClose}
      />

      {/* 3 Floating Docks (Left, Center, Right) */}
      <FloatingDock
        // Left Dock
        isLeftHidden={isLeftHidden}
        onToggleLeftHidden={() => setIsLeftHidden(!isLeftHidden)}
        onOpenFile={handleOpenFile}
        onNewFile={handleNewFile}
        onOpenSettings={() => setIsSettingsOpen(true)}

        // Center Dock
        isCenterHidden={isCenterHidden}
        onToggleCenterHidden={() => setIsCenterHidden(!isCenterHidden)}
        mode={mode}
        onToggleMode={() => setMode(prev => prev === 'view' ? 'edit' : 'view')}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        activeTool={activeTool}
        onSelectTool={handleSelectTool}
        pattern={pattern}
        onCyclePattern={handleCyclePattern}
        onTriggerImageUpload={handleTriggerImageUpload}

        // Right Dock
        isRightHidden={isRightHidden}
        onToggleRightHidden={() => setIsRightHidden(!isRightHidden)}
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
      />

      {/* Tool Popovers */}
      <TextPopover
        isOpen={openPopover === 'text'}
        onClose={() => setOpenPopover(null)}
        textColor={textColor}
        onOpenColorWheel={() => handleOpenColorWheel('text')}
        fontSize={fontSize}
        onChangeFontSize={setFontSize}
        isItalic={isItalic}
        onToggleItalic={() => setIsItalic(!isItalic)}
        isBold={isBold}
        onToggleBold={() => setIsBold(!isBold)}
        isStrikethrough={isStrikethrough}
        onToggleStrikethrough={() => setIsStrikethrough(!isStrikethrough)}
        textAlign={textAlign}
        onChangeAlign={setTextAlign}
      />

      <ShapePopover
        isOpen={openPopover === 'shape'}
        onClose={() => setOpenPopover(null)}
        currentShape={currentShape}
        onSelectShape={(shp) => {
          setCurrentShape(shp);
          setOpenPopover(null);
        }}
      />

      <PenPopover
        isOpen={openPopover === 'pen'}
        onClose={() => setOpenPopover(null)}
        strokeColor={strokeColor}
        onOpenColorWheel={() => handleOpenColorWheel('stroke')}
        strokeWeight={strokeWeight}
        onChangeStrokeWeight={setStrokeWeight}
        transparency={transparency}
        onChangeTransparency={setTransparency}
      />

      {/* Main Blackboard Canvas Area */}
      <div className="flex-1 w-full h-full relative">
        <BlackboardCanvas
          elements={elements}
          onChangeElements={setElements}
          onPushHistory={pushHistory}
          mode={mode}
          activeTool={activeTool}
          currentShape={currentShape}
          strokeColor={strokeColor}
          strokeWeight={strokeWeight}
          transparency={transparency}
          textColor={textColor}
          fontSize={fontSize}
          onChangeFontSize={setFontSize}
          isBold={isBold}
          isItalic={isItalic}
          isStrikethrough={isStrikethrough}
          textAlign={textAlign}
          onChangeAlign={setTextAlign}
          pattern={pattern}
          settings={settings}
          zoomLevel={zoomLevel}
          onChangeZoom={setZoomLevel}
        />
      </div>

      {/* Color Wheel Modal */}
      <ColorWheelModal
        isOpen={isColorWheelOpen}
        onClose={() => setIsColorWheelOpen(false)}
        currentColor={colorWheelTarget === 'stroke' ? strokeColor : textColor}
        onSelectColor={handleColorSelected}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onQuickExport={handleQuickExport}
        onRestoreSnapshot={(data) => {
          if (data && data.elements) {
            pushHistory();
            setElements(hydrateElements(data.elements));
            if (data.title) setTitle(data.title);
            if (data.pattern) setPattern(data.pattern);
          }
        }}
      />

      {/* Save Prompt on Exit Modal */}
      <SavePromptModal
        isOpen={showCloseModal}
        title={title}
        onSave={handleSaveAndClose}
        onDiscard={handleDiscardAndClose}
        onCancel={handleCancelClose}
      />
    </div>
  );
}
