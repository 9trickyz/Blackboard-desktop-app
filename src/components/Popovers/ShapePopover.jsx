import React from 'react';

export default function ShapePopover({
  isOpen,
  onClose,
  currentShape,
  onSelectShape
}) {
  if (!isOpen) return null;

  const shapeList = [
    // Row 1
    [
      {
        id: 'rectangle',
        label: 'Rectangle',
        svg: <rect x="3" y="3" width="18" height="18" rx="1" fill="none" stroke="currentColor" strokeWidth="2" />
      },
      {
        id: 'rounded_rect',
        label: 'Rounded Rectangle',
        svg: <rect x="3" y="4" width="18" height="16" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
      },
      {
        id: 'circle',
        label: 'Circle',
        svg: <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      },
      {
        id: 'triangle',
        label: 'Triangle',
        svg: <polygon points="12,3 21,20 3,20" fill="none" stroke="currentColor" strokeWidth="2" />
      },
      {
        id: 'diamond',
        label: 'Diamond',
        svg: <polygon points="12,3 21,12 12,21 3,12" fill="none" stroke="currentColor" strokeWidth="2" />
      }
    ],
    // Row 2
    [
      {
        id: 'hexagon',
        label: 'Hexagon',
        svg: <polygon points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5" fill="none" stroke="currentColor" strokeWidth="2" />
      },
      {
        id: 'star',
        label: 'Star',
        svg: <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" fill="none" stroke="currentColor" strokeWidth="2" />
      },
      {
        id: 'heart',
        label: 'Heart',
        svg: <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="none" stroke="currentColor" strokeWidth="2" />
      },
      {
        id: 'speech_bubble',
        label: 'Speech Bubble',
        svg: <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2z" fill="none" stroke="currentColor" strokeWidth="2" />
      },
      {
        id: 'arrow',
        label: 'Arrow',
        svg: <path d="M4 12h12m0 0l-5-5m5 5l-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      }
    ]
  ];

  return (
    <div className="absolute top-[68px] left-[45%] -translate-x-1/2 z-40 animate-popover">
      <div className="calm-tile rounded-2xl p-3 shadow-xl border border-white/10">
        <div className="flex flex-col gap-2">
          {shapeList.map((row, rIdx) => (
            <div key={rIdx} className="flex items-center gap-2">
              {row.map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    onSelectShape(s.id);
                    onClose && onClose();
                  }}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 active:scale-90 cursor-pointer ${
                    currentShape === s.id
                      ? 'bg-white/20 text-white border border-white/25 shadow-md scale-105'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-transparent'
                  }`}
                  title={s.label}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    {s.svg}
                  </svg>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
