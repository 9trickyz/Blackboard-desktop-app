import React, { useEffect } from 'react';

export default function SavePromptModal({
  isOpen,
  title,
  onSave,
  onDiscard,
  onCancel
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, onSave]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-6 animate-popover select-none">
      <div className="relative w-[580px] max-w-[94vw] px-10 pt-9 pb-8 rounded-lg glossy-modal border border-white/10 shadow-2xl flex flex-col items-center text-center" style={{ borderRadius: '8px' }}>
        
        {/* Title (Icon on top removed per user request) */}
        <h3 className="text-xl font-bold text-white tracking-wide mb-3">
          Save Blackboard Changes?
        </h3>

        {/* Subtitle / Description */}
        <p className="text-sm text-gray-300 leading-relaxed max-w-[460px] mb-8">
          You have unsaved progress on <span className="text-white font-medium">"{title || 'Untitled'}"</span>.
          Would you like to save your blackboard file before closing?
        </p>

        {/* Action Buttons (Shortened width, less rounded corners, spread out) */}
        <div className="w-full flex flex-col items-center gap-3.5">
          {/* Save & Close Button (Primary, shortened width) */}
          <button
            onClick={onSave}
            className="w-[260px] py-2.5 px-4 rounded-md bg-white text-black font-semibold text-sm hover:bg-gray-100 active:scale-[0.98] transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Save Blackboard File</span>
          </button>

          {/* Discard Changes Button (Destructive, shortened width) */}
          <button
            onClick={onDiscard}
            className="w-[260px] py-2.5 px-4 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/25 active:scale-[0.98] transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] text-sm font-medium cursor-pointer"
          >
            <span>Discard Changes & Exit</span>
          </button>

          {/* Cancel (Abort Exit) */}
          <button
            onClick={onCancel}
            className="py-1.5 px-5 rounded-md text-gray-400 hover:text-white hover:bg-white/[0.04] active:scale-[0.98] transition-all duration-200 text-xs font-medium mt-1 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
