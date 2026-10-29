import React, { useState, useEffect } from 'react';
import { calculateStorageUsage, clearOfflineCache, getSnapshots } from '../utils/storage';

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onQuickExport,
  onRestoreSnapshot
}) {
  const [activeCategory, setActiveCategory] = useState('export'); // 'export' | 'performance' | 'storage' | 'ink' | 'pin'
  const [cacheSize, setCacheSize] = useState('0 KB');
  const [snapshots, setSnapshots] = useState([]);
  const [showSnapshotsList, setShowSnapshotsList] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCacheSize(calculateStorageUsage());
      setSnapshots(getSnapshots());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const updateSetting = (section, key, value) => {
    onUpdateSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [key]: value
      }
    });
  };

  const handleClearCache = () => {
    if (window.confirm('Clear all offline cached boards and snapshots? Settings will be preserved.')) {
      clearOfflineCache();
      setCacheSize(calculateStorageUsage());
      setSnapshots([]);
    }
  };

  // Pure clean text categories with NO emojis
  const categories = [
    { id: 'export', label: 'Export & Assets' },
    { id: 'performance', label: 'Performance & GPU' },
    { id: 'storage', label: 'Version History & Cache' },
    { id: 'ink', label: 'Ink-to-Shape' },
    { id: 'pin', label: 'Pin / Sit on Top' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-6 animate-popover">
      <div className="relative w-[1000px] max-w-[95vw] h-[640px] max-h-[90vh] flex rounded-xl glossy-modal text-gray-200 overflow-hidden shadow-2xl border border-white/[0.05]">
        
        {/* Left Sidebar Navigation (Clean typography, no emojis) */}
        <div className="w-[230px] flex-shrink-0 bg-[#0a0c0f]/95 border-r border-white/[0.04] flex flex-col justify-between p-6 select-none">
          <div>
            {/* Header: App Title */}
            <div className="flex items-center gap-3 pb-5 mb-5 border-b border-white/[0.04]">
              <div className="w-8 h-8 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                <img src="./icons/SetingsTool.png" alt="Settings" className="w-4 h-4 object-contain" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">Blackboard</h2>
                <span className="text-[11px] text-slate-400 block -mt-0.5">Settings & Preferences</span>
              </div>
            </div>

            {/* Navigation Categories */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 block mb-2">
                Configurations
              </span>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex items-center px-3.5 py-2.5 rounded-md text-left text-xs transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] hover:translate-x-1 active:scale-[0.97] cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-white/[0.12] text-white font-semibold border border-white/[0.08] shadow-sm translate-x-1'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="truncate">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Sidebar Info */}
          <div className="pt-4 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Version 1.0.5</span>
            <span className="px-2 py-0.5 rounded bg-white/[0.04] text-[10px] text-slate-400">
              Desktop
            </span>
          </div>
        </div>

        {/* Right Main Content Area */}
        <div className="flex-1 flex flex-col bg-[#0e1015]/95 overflow-hidden">
          
          {/* Top Breadcrumb & Re-aligned Close Bar */}
          <div className="h-14 px-8 border-b border-white/[0.04] flex items-center justify-between select-none flex-shrink-0">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Settings</span>
              <span className="text-slate-600">›</span>
              <span className="text-white font-semibold">
                {categories.find(c => c.id === activeCategory)?.label}
              </span>
            </div>
            {/* Perfectly Aligned X Close Button with iOS Spring Tap */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] hover:scale-110 active:scale-90 transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer"
              title="Close (Esc)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Centered Content Body (Horizontally Centered in Middle of Pane, NO Black Box Borders) */}
          <div className="flex-1 overflow-y-auto p-8 flex justify-center">
            <div className="w-full max-w-[490px] space-y-6">
              
              {/* Category 1: Export Defaults & Asset Rendering */}
              {activeCategory === 'export' && (
                <div className="space-y-6 animate-popover">
                  <div className="pb-1 text-left">
                    <h3 className="text-base font-bold text-white mb-1.5 tracking-wide">Export Defaults & Asset Rendering</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Streamlines saving assets for presentations, pitch decks, and documentation without forcing you to reconfigure export resolution or background transparency on every export.
                    </p>
                  </div>

                  {/* Borderless Options Spaced Out Cleanly */}
                  <div className="space-y-4">
                    {/* Default Format */}
                    <div className="flex items-center justify-between py-2 gap-4">
                      <div className="flex-1 pr-3">
                        <span className="text-[13px] font-semibold text-white block">Default Export Format</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5 leading-normal">Choose between vector SVG, multi-page PDF, or high-res PNG</span>
                      </div>
                      <div className="flex-shrink-0 w-[240px] flex justify-end items-center">
                        <div className="segmented-group">
                          {['PNG', 'SVG', 'PDF'].map(fmt => (
                            <button
                              key={fmt}
                              onClick={() => updateSetting('export', 'format', fmt)}
                              className={`segmented-btn ${settings.export?.format === fmt ? 'active' : ''}`}
                            >
                              {fmt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Transparent Background */}
                    <div className="flex items-center justify-between py-2 gap-4">
                      <div className="flex-1 pr-3">
                        <span className="text-[13px] font-semibold text-white block">Transparent Background</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5 leading-normal">Remove chalkboard surface from exported image</span>
                      </div>
                      <div className="flex-shrink-0 w-[240px] flex justify-end items-center">
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={Boolean(settings.export?.transparentBg)}
                            onChange={(e) => updateSetting('export', 'transparentBg', e.target.checked)}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>

                    {/* Resolution Multiplier */}
                    <div className="flex items-center justify-between py-2 gap-4">
                      <div className="flex-1 pr-3">
                        <span className="text-[13px] font-semibold text-white block">Resolution Multiplier</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5 leading-normal">Scale resolution for ultra-sharp Retina presentations</span>
                      </div>
                      <div className="flex-shrink-0 w-[240px] flex justify-end items-center">
                        <div className="segmented-group">
                          {[
                            { val: 1, label: '1x' },
                            { val: 2, label: '2x (Retina)' },
                            { val: 3, label: '3x HD' }
                          ].map(item => (
                            <button
                              key={item.val}
                              onClick={() => updateSetting('export', 'multiplier', item.val)}
                              className={`segmented-btn ${settings.export?.multiplier === item.val ? 'active' : ''}`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Framing */}
                    <div className="flex items-center justify-between py-2 gap-4">
                      <div className="flex-1 pr-3">
                        <span className="text-[13px] font-semibold text-white block">Framing Mode</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5 leading-normal">Tight crop around board drawings vs full visible canvas frame</span>
                      </div>
                      <div className="flex-shrink-0 w-[240px] flex justify-end items-center">
                        <div className="segmented-group">
                          <button
                            onClick={() => updateSetting('export', 'framing', 'crop')}
                            className={`segmented-btn ${settings.export?.framing === 'crop' ? 'active' : ''}`}
                          >
                            Crop to Content
                          </button>
                          <button
                            onClick={() => updateSetting('export', 'framing', 'full')}
                            className={`segmented-btn ${settings.export?.framing === 'full' ? 'active' : ''}`}
                          >
                            Full Visible Frame
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Quick Export Row */}
                    <div className="flex items-center justify-between py-2 gap-4">
                      <div className="flex-1 pr-3">
                        <span className="text-[13px] font-semibold text-white block">One-Click Quick Export</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5 leading-normal">Export the current board immediately using these defaults</span>
                      </div>
                      <div className="flex-shrink-0 w-[240px] flex justify-end items-center">
                        <button
                          onClick={onQuickExport}
                          className="px-5 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold hover:scale-105 active:scale-95 transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer shadow-sm hover:shadow-blue-500/20"
                        >
                          Export Board Now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Category 2: Performance & Rendering Fidelity */}
              {activeCategory === 'performance' && (
                <div className="space-y-6 animate-popover">
                  <div className="pb-1 text-left">
                    <h3 className="text-base font-bold text-white mb-1.5 tracking-wide">Performance & Rendering Fidelity</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Keeps massive boards with thousands of vector nodes, sticky notes, and embedded media running smoothly on lower-spec machines without draining battery.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Hardware Acceleration */}
                    <div className="flex items-center justify-between py-2 gap-4">
                      <div className="flex-1 pr-3">
                        <span className="text-[13px] font-semibold text-white block">Hardware Acceleration</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5 leading-normal">Leverage GPU rasterization for smooth 60+ FPS navigation</span>
                      </div>
                      <div className="flex-shrink-0 w-[240px] flex justify-end items-center">
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={settings.performance?.hardwareAccel !== false}
                            onChange={(e) => updateSetting('performance', 'hardwareAccel', e.target.checked)}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>

                    {/* Frame Rate Limiter */}
                    <div className="flex items-center justify-between py-2 gap-4">
                      <div className="flex-1 pr-3">
                        <span className="text-[13px] font-semibold text-white block">Frame Rate Limiter</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5 leading-normal">Cap rendering cycles to conserve laptop battery</span>
                      </div>
                      <div className="flex-shrink-0 w-[240px] flex justify-end items-center">
                        <div className="segmented-group">
                          {[
                            { label: '30 FPS', val: '30' },
                            { label: '60 FPS', val: '60' },
                            { label: 'Uncapped', val: 'uncapped' }
                          ].map(item => (
                            <button
                              key={item.val}
                              onClick={() => updateSetting('performance', 'fpsLimit', item.val)}
                              className={`segmented-btn ${settings.performance?.fpsLimit === item.val ? 'active' : ''}`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Large-Image Downsampling */}
                    <div className="flex items-center justify-between py-2 gap-4">
                      <div className="flex-1 pr-3">
                        <span className="text-[13px] font-semibold text-white block">Large-Image Downsampling</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5 leading-normal">Automatically optimize oversized pasted photos on canvas</span>
                      </div>
                      <div className="flex-shrink-0 w-[240px] flex justify-end items-center">
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={settings.performance?.imageDownsampling !== false}
                            onChange={(e) => updateSetting('performance', 'imageDownsampling', e.target.checked)}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>

                    {/* Low Power Mode */}
                    <div className="flex items-center justify-between py-2 gap-4">
                      <div className="flex-1 pr-3">
                        <span className="text-[13px] font-semibold text-white block">Low-Power / Battery Saver</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5 leading-normal">Pause background redraws when the window is idle</span>
                      </div>
                      <div className="flex-shrink-0 w-[240px] flex justify-end items-center">
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={Boolean(settings.performance?.lowPowerMode)}
                            onChange={(e) => updateSetting('performance', 'lowPowerMode', e.target.checked)}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Category 3: Version History & Offline Cache */}
              {activeCategory === 'storage' && (
                <div className="space-y-6 animate-popover">
                  <div className="pb-1 text-left">
                    <h3 className="text-base font-bold text-white mb-1.5 tracking-wide">Version History & Offline Cache Management</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Protects complex brainstorming work from connection drops and accidental board resets, while giving storage-conscious users control over local disk usage.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Auto-Save Frequency */}
                    <div className="flex items-center justify-between py-2 gap-4">
                      <div className="flex-1 pr-3">
                        <span className="text-[13px] font-semibold text-white block">Auto-Save Frequency</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5 leading-normal">Interval for continuous background document persistence</span>
                      </div>
                      <div className="flex-shrink-0 w-[240px] flex justify-end items-center">
                        <div className="segmented-group">
                          {['30s', '1m', '5m', 'off'].map(interval => (
                            <button
                              key={interval}
                              onClick={() => updateSetting('versionHistory', 'autoSaveInterval', interval)}
                              className={`segmented-btn ${settings.versionHistory?.autoSaveInterval === interval ? 'active' : ''}`}
                            >
                              {interval}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Automatic Milestones */}
                    <div className="flex items-center justify-between py-2 gap-4">
                      <div className="flex-1 pr-3">
                        <span className="text-[13px] font-semibold text-white block">Automatic Milestone Snapshots</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5 leading-normal">Save revision milestones hourly and on session close</span>
                      </div>
                      <div className="flex-shrink-0 w-[240px] flex justify-end items-center">
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={settings.versionHistory?.milestoneSnapshots !== false}
                            onChange={(e) => updateSetting('versionHistory', 'milestoneSnapshots', e.target.checked)}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>

                    {/* Conflict Preference */}
                    <div className="flex items-center justify-between py-2 gap-4">
                      <div className="flex-1 pr-3">
                        <span className="text-[13px] font-semibold text-white block">Conflict Resolution Preference</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5 leading-normal">Default behavior when multi-device state differs</span>
                      </div>
                      <div className="flex-shrink-0 w-[240px] flex justify-end items-center">
                        <select
                          value={settings.versionHistory?.conflictResolution || 'local'}
                          onChange={(e) => updateSetting('versionHistory', 'conflictResolution', e.target.value)}
                          className="px-3 py-1.5 rounded-md bg-[#161820] border border-white/[0.08] text-xs text-white outline-none cursor-pointer"
                        >
                          <option value="local">Keep Local</option>
                          <option value="remote">Keep Remote</option>
                          <option value="ask">Ask Each Time</option>
                        </select>
                      </div>
                    </div>

                    {/* Disk Cache & Snapshots */}
                    <div className="flex items-center justify-between py-2 gap-4">
                      <div className="flex-1 pr-3">
                        <span className="text-[13px] font-semibold text-white block">Local Storage Usage</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">{cacheSize} cached on local disk</span>
                      </div>
                      <div className="flex-shrink-0 w-[240px] flex justify-end items-center gap-2">
                        <button
                          onClick={() => setShowSnapshotsList(!showSnapshotsList)}
                          className="px-3 py-1.5 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-slate-200 transition cursor-pointer"
                        >
                          {showSnapshotsList ? 'Hide' : `Snapshots (${snapshots.length})`}
                        </button>
                        <button
                          onClick={handleClearCache}
                          className="px-3 py-1.5 rounded-md bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/20 text-xs font-medium transition cursor-pointer"
                        >
                          Clear Cache
                        </button>
                      </div>
                    </div>
                  </div>

                  {showSnapshotsList && snapshots.length > 0 && (
                    <div className="p-3.5 rounded-lg bg-black/60 border border-white/[0.06] max-h-44 overflow-y-auto space-y-1.5">
                      {snapshots.map(s => (
                        <div key={s.id} className="flex items-center justify-between text-xs p-2.5 rounded bg-white/[0.03] hover:bg-white/[0.06]">
                          <div>
                            <span className="font-semibold text-white">{new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="text-slate-400 ml-2">({s.elementCount} items)</span>
                          </div>
                          <button
                            onClick={() => {
                              onRestoreSnapshot && onRestoreSnapshot(s.data);
                              setShowSnapshotsList(false);
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300 font-semibold px-2 py-0.5 rounded bg-blue-500/10 cursor-pointer"
                          >
                            Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Category 4: Auto-Shape & Stroke Recognition (Disabled on first boot) */}
              {activeCategory === 'ink' && (
                <div className="space-y-6 animate-popover">
                  <div className="pb-1 text-left">
                    <h3 className="text-base font-bold text-white mb-1.5 tracking-wide">Auto-Shape & Stroke Recognition (Ink-to-Shape)</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Instantly converts rough, hand-drawn loops into crisp circles, uneven polygons into clean rectangles, and scribbled pointers into snapped flowchart connectors.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Master Toggle (Default OFF on first boot) */}
                    <div className="flex items-center justify-between py-2 gap-4">
                      <div className="flex-1 pr-3">
                        <span className="text-[13px] font-semibold text-white block">Ink-to-Shape Conversion</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5 leading-normal">Automatically transform hand-drawn loops into vector shapes</span>
                      </div>
                      <div className="flex-shrink-0 w-[240px] flex justify-end items-center">
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={Boolean(settings.inkToShape?.enabled)}
                            onChange={(e) => updateSetting('inkToShape', 'enabled', e.target.checked)}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>

                    {/* Delay Slider */}
                    <div className="flex items-center justify-between py-2 gap-4">
                      <div className="flex-1 pr-3">
                        <span className="text-[13px] font-semibold text-white block">Convert Delay</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5 leading-normal">Pause duration after stroke release before shape recognition</span>
                      </div>
                      <div className="flex-shrink-0 w-[240px] flex items-center justify-end gap-3">
                        <input
                          type="range"
                          min="200"
                          max="1500"
                          step="50"
                          value={settings.inkToShape?.delayMs || 500}
                          onChange={(e) => updateSetting('inkToShape', 'delayMs', parseInt(e.target.value))}
                          className="w-32 h-1.5 bg-gray-700/80 rounded appearance-none cursor-pointer accent-blue-500"
                        />
                        <span className="text-xs font-mono font-semibold text-slate-300 w-14 text-right">
                          {settings.inkToShape?.delayMs || 500} ms
                        </span>
                      </div>
                    </div>

                    {/* Connector Auto-Snapping (Default OFF on first boot) */}
                    <div className="flex items-center justify-between py-2 gap-4">
                      <div className="flex-1 pr-3">
                        <span className="text-[13px] font-semibold text-white block">Arrow / Connector Auto-Snapping</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5 leading-normal">Snap straight lines and arrows to 45° and 90° angles</span>
                      </div>
                      <div className="flex-shrink-0 w-[240px] flex justify-end items-center">
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={Boolean(settings.inkToShape?.arrowSnapping)}
                            onChange={(e) => updateSetting('inkToShape', 'arrowSnapping', e.target.checked)}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>

                    {/* Ink to Text (Default OFF on first boot) */}
                    <div className="flex items-center justify-between py-2 gap-4">
                      <div className="flex-1 pr-3">
                        <span className="text-[13px] font-semibold text-white block">Ink-to-Text Recognition</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5 leading-normal">Convert handwritten letters into editable text notes</span>
                      </div>
                      <div className="flex-shrink-0 w-[240px] flex justify-end items-center">
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={Boolean(settings.inkToShape?.inkToText)}
                            onChange={(e) => updateSetting('inkToShape', 'inkToText', e.target.checked)}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Category 5: Pin / Sit on Top */}
              {activeCategory === 'pin' && (
                <div className="space-y-6 animate-popover">
                  <div className="pb-1 text-left">
                    <h3 className="text-base font-bold text-white mb-1.5 tracking-wide">Pin / Sit on Top</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Sits the app on top of other tabs and windows if you switch tabs, enabling seamless side-by-side sketching and referencing.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 gap-4">
                      <div className="flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-white">Always on Top Mode</span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            settings.pinOnTop
                              ? 'bg-green-500/15 text-green-300 border border-green-500/25'
                              : 'bg-white/[0.05] text-slate-400'
                          }`}>
                            {settings.pinOnTop ? 'PINNED' : 'NORMAL'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5 leading-normal">
                          {settings.pinOnTop
                            ? 'Window floats above all browsers and desktop applications'
                            : 'Standard desktop window behavior'}
                        </span>
                      </div>
                      <div className="flex-shrink-0 w-[240px] flex justify-end items-center">
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={Boolean(settings.pinOnTop)}
                            onChange={(e) => {
                              const val = e.target.checked;
                              onUpdateSettings({ ...settings, pinOnTop: val });
                              if (window.electronAPI && window.electronAPI.setAlwaysOnTop) {
                                window.electronAPI.setAlwaysOnTop(val);
                              }
                            }}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Footer Bar ("Press Esc to exit" Centered, NOT in corner) */}
          <div className="h-12 border-t border-white/[0.04] flex items-center justify-center gap-6 bg-[#0a0c10]/70 flex-shrink-0 text-xs select-none">
            <span className="text-slate-500">Settings automatically saved</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400 font-mono">Press Esc to exit</span>
          </div>

        </div>

      </div>
    </div>
  );
}
