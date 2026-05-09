import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchTasks } from '../api/tasks'
import { fetchTaskTypes } from '../api/taskTypes'

const SQUARE = 8   // px per side
const GAP    = 1   // px between squares
const CELL   = SQUARE + GAP

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function HabitsPage() {
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  const { data: taskTypes = [] } = useQuery({
    queryKey: ['task-types'],
    queryFn: fetchTaskTypes,
  })

  const today = useMemo(() => new Date(), [])
  const endDate   = toDateStr(today)
  const startDate = toDateStr(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()))

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', startDate, endDate],
    queryFn: () => fetchTasks(startDate, endDate),
  })

  // Map date → color of the first completed (non-reminder) task of selected type
  const dateColors = useMemo(() => {
    const map = new Map<string, string>()
    const sorted = [...tasks].sort((a, b) => (a.task_type ?? 999999) - (b.task_type ?? 999999))
    for (const t of sorted) {
      if (!t.completed || t.is_reminder) continue
      if (selectedTypeId != null && t.task_type !== selectedTypeId) continue
      if (!map.has(t.date)) {
        map.set(t.date, t.task_type_detail?.color ?? '#6366f1')
      }
    }
    return map
  }, [tasks, selectedTypeId])

  // Streak: today counts if completed; incomplete today doesn't break it.
  // Rest days skipped; 8+ consecutive rest days end the streak.
  const streak = useMemo(() => {
    const todayStr = toDateStr(today)
    let n = dateColors.has(todayStr) ? 1 : 0
    let restRun = 0
    const d = new Date(today)
    d.setDate(d.getDate() - 1)
    for (let i = 0; i < 366; i++) {
      if (dateColors.has(toDateStr(d))) {
        n++
        restRun = 0
      } else {
        restRun++
        if (restRun > 7) break
      }
      d.setDate(d.getDate() - 1)
    }
    return n
  }, [dateColors, today])

  // Track container dimensions so the grid fills the space exactly
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const cols  = size.w > 0 ? Math.floor(size.w / CELL) : 0
  const rows  = size.h > 0 ? Math.floor(size.h / CELL) : 0
  const total = cols * rows

  return (
    <div className="h-full flex flex-col bg-white dark:bg-od-800">
      {/* Type selector */}
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-od-600 flex-shrink-0 flex-wrap">
        {taskTypes.map(tt => (
          <button
            key={tt.id}
            onClick={() => setSelectedTypeId(selectedTypeId === tt.id ? null : tt.id)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all"
            style={
              selectedTypeId === tt.id
                ? { backgroundColor: tt.color, borderColor: tt.color, color: '#fff' }
                : { borderColor: tt.color + '60', color: tt.color, backgroundColor: tt.color + '12' }
            }
          >
            {tt.name}
          </button>
        ))}

        <div className="flex-1" />

        <div className="text-right">
          <span className="text-3xl font-bold text-gray-900 dark:text-od-100 tabular-nums">{streak}</span>
          <span className="text-sm text-gray-400 dark:text-od-400 ml-1.5">day streak</span>
        </div>
      </div>

      {/* Pixel grid — each square = one day, oldest top-left, today bottom-right */}
      <div ref={containerRef} className="flex-1 overflow-hidden p-3">
        {total > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, ${SQUARE}px)`,
              gap: `${GAP}px`,
            }}
          >
            {Array.from({ length: total }, (_, i) => {
              const dayOffset = total - 1 - i
              const d = new Date(today)
              d.setDate(d.getDate() - dayOffset)
              const color = dayOffset <= 365 ? dateColors.get(toDateStr(d)) : undefined
              return (
                <div
                  key={i}
                  style={{
                    width: SQUARE,
                    height: SQUARE,
                    backgroundColor: color ?? undefined,
                  }}
                  className={color ? '' : 'bg-gray-200 dark:bg-od-700'}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
