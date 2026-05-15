import { useState, useEffect, useRef } from 'react'

const PALETTE = [
  { label: 'Default', value: null },
  { label: 'Red',     value: '#ef4444' },
  { label: 'Orange',  value: '#f97316' },
  { label: 'Yellow',  value: '#ca8a04' },
  { label: 'Green',   value: '#16a34a' },
  { label: 'Blue',    value: '#2563eb' },
  { label: 'Purple',  value: '#7c3aed' },
  { label: 'Pink',    value: '#db2777' },
]

interface Props {
  activeColor: string | null
  onSelect: (color: string | null) => void
}

export default function ColorDropdown({ activeColor, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      <button
        type="button"
        title="Text color"
        onMouseDown={e => { e.preventDefault(); setOpen(o => !o) }}
        className={`flex items-center gap-0.5 px-2 py-1 rounded text-xs font-medium transition-colors select-none ${
          open || activeColor
            ? 'bg-gray-200 dark:bg-od-700 text-gray-900 dark:text-od-100'
            : 'text-gray-400 dark:text-od-400 hover:bg-gray-100 dark:hover:bg-od-700 hover:text-gray-700 dark:hover:text-od-100'
        }`}
      >
        <span className="relative leading-none font-bold pb-0.5" style={{ color: activeColor ?? undefined }}>
          A
          <span
            className="absolute left-0 right-0 bottom-0 h-[2px] rounded-full"
            style={{ backgroundColor: activeColor ?? '#9ca3af' }}
          />
        </span>
        <svg width="8" height="8" viewBox="0 0 8 8" className="ml-0.5 opacity-60">
          <path d="M1 2.5 L4 5.5 L7 2.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-od-800 border border-gray-200 dark:border-od-600 rounded-xl shadow-lg p-2 w-36">
          <div className="grid grid-cols-4 gap-1.5">
            {PALETTE.map(({ label, value }) => {
              const isActive = value === null ? !activeColor : activeColor === value
              return (
                <button
                  key={label}
                  type="button"
                  title={label}
                  onMouseDown={e => { e.preventDefault(); onSelect(value); setOpen(false) }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    isActive ? 'ring-2 ring-offset-1 ring-blue-500 scale-110' : 'hover:scale-110'
                  }`}
                  style={value ? { backgroundColor: value } : { background: 'white', border: '1.5px solid #d1d5db' }}
                >
                  {!value && (
                    <svg width="8" height="8" viewBox="0 0 10 10" className="text-gray-400">
                      <line x1="1" y1="9" x2="9" y2="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
