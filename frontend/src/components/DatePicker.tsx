import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_LABELS = ['Mo','Tu','We','Th','Fr','Sa','Su']

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function displayDate(ds: string): string {
  if (!ds) return 'Pick a date'
  return new Date(ds + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

interface Props {
  value: string
  onChange: (date: string) => void
  min?: string
  className?: string
}

export default function DatePicker({ value, onChange, min, className = '' }: Props) {
  const today = todayStr()
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)

  const initVal = value || today
  const [viewYear, setViewYear] = useState(() => parseInt(initVal.slice(0, 4)))
  const [viewMonth, setViewMonth] = useState(() => parseInt(initVal.slice(5, 7)) - 1)

  function openPicker() {
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect())
    if (value) {
      setViewYear(parseInt(value.slice(0, 4)))
      setViewMonth(parseInt(value.slice(5, 7)) - 1)
    }
    setOpen(true)
  }

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) close()
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open, close])

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const firstDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  function cellDs(day: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const dropdown = open && rect ? createPortal(
    <div ref={dropRef}
      style={{ position: 'fixed', top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 272), zIndex: 9999 }}
      className="bg-white dark:bg-od-800 border border-gray-200 dark:border-od-600 rounded-2xl shadow-2xl p-4 select-none">

      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-od-700 text-gray-400 hover:text-gray-700 dark:hover:text-od-100 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-800 dark:text-od-100">{MONTHS[viewMonth]} {viewYear}</span>
        <button type="button" onClick={nextMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-od-700 text-gray-400 hover:text-gray-700 dark:hover:text-od-100 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-400 dark:text-od-500 uppercase py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const d = cellDs(day)
          const isSel = d === value
          const isTod = d === today
          const isDisabled = !!min && d < min
          return (
            <button key={i} type="button" disabled={isDisabled}
              onClick={() => { onChange(d); close() }}
              className={`
                aspect-square rounded-lg text-xs font-medium transition-all
                ${isDisabled ? 'text-gray-200 dark:text-od-600 cursor-not-allowed' :
                  isSel ? 'bg-blue-600 text-white shadow-sm' :
                  isTod ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-semibold ring-1 ring-blue-300 dark:ring-blue-700' :
                  'hover:bg-gray-100 dark:hover:bg-od-700 text-gray-700 dark:text-od-200'}
              `}>
              {day}
            </button>
          )
        })}
      </div>

      {value !== today && !(min && today < min) && (
        <button type="button" onClick={() => { onChange(today); close() }}
          className="mt-3 w-full text-xs font-semibold text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
          Today
        </button>
      )}
    </div>,
    document.body,
  ) : null

  return (
    <>
      <button ref={btnRef} type="button" onClick={openPicker}
        className={`flex items-center gap-2 text-left ${className}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          className="text-gray-400 flex-shrink-0">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span className={value ? 'text-gray-900 dark:text-od-100' : 'text-gray-400 dark:text-od-400'}>
          {displayDate(value)}
        </span>
      </button>
      {dropdown}
    </>
  )
}
