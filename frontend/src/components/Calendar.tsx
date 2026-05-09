import { useState, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchTasks } from '../api/tasks'
import type { Task } from '../types'
import PeriodEditor from './PeriodEditor'

interface Props {
  onSelectDate: (date: string) => void
  filterTypeId: number | null
}

type View = 'calendar' | 'notes'

// Monday-first
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// 0 = Monday … 6 = Sunday
function mondayDow(d: Date): number {
  return (d.getDay() + 6) % 7
}

function isoWeek(d: Date): { week: number; year: number } {
  const day = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((day.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return { week, year: day.getUTCFullYear() }
}

export default function Calendar({ onSelectDate, filterTypeId }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [view, setView] = useState<View>('calendar')
  const [weekNote, setWeekNote] = useState<{ week: number; year: number } | null>(null)
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [showYearPicker, setShowYearPicker] = useState(false)
  const [yearRangeStart, setYearRangeStart] = useState(() => Math.floor(today.getFullYear() / 12) * 12)
  const monthBtnRef = useRef<HTMLButtonElement>(null)
  const yearBtnRef = useRef<HTMLButtonElement>(null)
  const [monthPickerPos, setMonthPickerPos] = useState({ top: 0, left: 0 })
  const [yearPickerPos, setYearPickerPos] = useState({ top: 0, left: 0 })

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startDate = toDateStr(year, month, 1)
  const endDate = toDateStr(year, month, daysInMonth)

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks', startDate, endDate],
    queryFn: () => fetchTasks(startDate, endDate),
    enabled: view === 'calendar',
  })

  const tasks = useMemo(
    () => filterTypeId != null ? allTasks.filter(t => t.task_type === filterTypeId) : allTasks,
    [allTasks, filterTypeId]
  )

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const t of tasks) {
      if (!map[t.date]) map[t.date] = []
      map[t.date].push(t)
    }
    return map
  }, [tasks])

  // Monday-first: blank cells before day 1
  const firstDow = mondayDow(new Date(year, month, 1))
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  // Build rows of exactly 7 cells (null = blank)
  const rows: (number | null)[][] = []
  let row: (number | null)[] = Array.from({ length: firstDow }, () => null)
  for (const day of days) {
    row.push(day)
    if (row.length === 7) { rows.push(row); row = [] }
  }
  if (row.length > 0) {
    while (row.length < 7) row.push(null)
    rows.push(row)
  }

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  function openMonthPicker() {
    if (monthBtnRef.current) {
      const r = monthBtnRef.current.getBoundingClientRect()
      setMonthPickerPos({ top: r.bottom + 8, left: r.left })
    }
    setShowMonthPicker(true); setShowYearPicker(false)
  }

  function openYearPicker() {
    if (yearBtnRef.current) {
      const r = yearBtnRef.current.getBoundingClientRect()
      setYearPickerPos({ top: r.bottom + 8, left: r.left })
    }
    setYearRangeStart(Math.floor(year / 12) * 12)
    setShowYearPicker(true); setShowMonthPicker(false)
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-od-800 rounded-2xl shadow-sm border border-gray-200 dark:border-od-600 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-1 px-4 py-3.5 border-b border-gray-100 dark:border-od-600 flex-shrink-0">
        <button onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-od-700 text-gray-400 hover:text-gray-700 dark:hover:text-od-100 transition-colors text-xl font-light leading-none flex-shrink-0">‹</button>
        <button ref={monthBtnRef} onClick={openMonthPicker}
          className="px-2 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-od-700 transition-colors text-base font-semibold text-gray-900 dark:text-od-100">
          {MONTHS[month]}
        </button>
        <button ref={yearBtnRef} onClick={openYearPicker}
          className="px-2 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-od-700 transition-colors text-base font-semibold text-gray-500 dark:text-od-400">
          {year}
        </button>
        <button onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-od-700 text-gray-400 hover:text-gray-700 dark:hover:text-od-100 transition-colors text-xl font-light leading-none flex-shrink-0">›</button>

        <div className="flex-1" />

        {weekNote && (
          <button onClick={() => setWeekNote(null)}
            className="mr-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            W{weekNote.week}
          </button>
        )}

        <div className="flex bg-gray-100 dark:bg-od-700 rounded-xl p-0.5">
          {(['calendar', 'notes'] as View[]).map(v => (
            <button key={v} onClick={() => { setView(v); setWeekNote(null) }}
              className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${
                view === v && !weekNote
                  ? 'bg-white dark:bg-od-700 text-gray-900 dark:text-od-100 shadow-sm'
                  : 'text-gray-400 dark:text-od-400 hover:text-gray-600 dark:hover:text-od-100'
              }`}>
              {v === 'notes' ? 'Notes' : 'Calendar'}
            </button>
          ))}
        </div>
      </div>

      {weekNote ? (
        <PeriodEditor key={`week-${weekNote.year}-${weekNote.week}`} year={weekNote.year} month={null} week={weekNote.week} />
      ) : view === 'calendar' ? (
        /*
         * Single CSS grid — all rows share the same column tracks, so
         * day labels and day cells are guaranteed to align pixel-perfectly.
         * gridTemplateColumns: week-icon column + 7 equal day columns
         */
        <div
          className="flex-1 overflow-hidden grid"
          style={{
            gridTemplateColumns: '1.5rem repeat(7, 1fr)',
            gridTemplateRows: `2rem repeat(${rows.length}, 1fr)`,
          }}
        >
          {/* Header row: spacer + 7 day-name labels */}
          <div className="border-b border-r border-gray-100 dark:border-od-600 bg-gray-50/60 dark:bg-od-700/40" />
          {DAYS.map((d, i) => (
            <div key={d}
              className={`border-b bg-gray-50/60 dark:bg-od-700/40 flex items-center justify-center text-[11px] font-semibold text-gray-400 dark:text-od-400 uppercase tracking-widest${i < 6 ? ' border-r border-gray-100 dark:border-od-600' : ''}`}>
              {d}
            </div>
          ))}

          {/* Data rows: flatMap emits 8 grid cells per week row */}
          {rows.flatMap((rowDays, ri) => {
            const isLastRow = ri === rows.length - 1
            const bB = isLastRow ? '' : ' border-b border-gray-100 dark:border-od-600'
            const firstReal = rowDays.find(d => d != null)
            const weekInfo = firstReal != null ? isoWeek(new Date(year, month, firstReal)) : null

            return [
              // Week-note icon cell — full cell is the click target
              <div key={`wi${ri}`}
                className={`border-r border-gray-100 dark:border-od-600${bB} flex`}>
                {weekInfo && (
                  <button
                    onClick={() => setWeekNote(weekInfo)}
                    title={`Notes for W${weekInfo.week}`}
                    className="flex-1 flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-300 dark:text-od-500 hover:text-blue-400 transition-colors"
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                )}
              </div>,

              // 7 day cells
              ...rowDays.map((day, ci) => {
                const bR = ci < 6 ? ' border-r border-gray-100 dark:border-od-600' : ''

                if (day == null) {
                  return <div key={`b${ri}-${ci}`} className={`bg-gray-50/30 dark:bg-od-700/20${bR}${bB}`} />
                }

                const ds = toDateStr(year, month, day)
                const dayTasks = tasksByDate[ds] || []
                const open = dayTasks.filter(t => !t.completed)
                const done = dayTasks.filter(t => t.completed)
                const isToday = ds === todayStr
                const dow = mondayDow(new Date(ds + 'T00:00:00'))
                const isWeekend = dow >= 5 // Sat=5, Sun=6

                return (
                  <div key={day} onClick={() => onSelectDate(ds)}
                    className={`${bR}${bB} p-1.5 cursor-pointer group transition-colors flex flex-col overflow-hidden${
                      isToday
                        ? ' bg-blue-50/70 dark:bg-blue-900/20 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                        : isWeekend
                        ? ' bg-gray-50/60 dark:bg-od-700/30 hover:bg-gray-100/60 dark:hover:bg-od-700/50'
                        : ' hover:bg-slate-50 dark:hover:bg-od-700/40'
                    }`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs transition-colors select-none${
                        isToday
                          ? ' bg-blue-600 text-white font-bold shadow-sm'
                          : isWeekend
                          ? ' text-gray-400 dark:text-od-400 font-medium'
                          : ' text-gray-600 dark:text-od-400 font-medium group-hover:bg-white dark:group-hover:bg-od-700'
                      }`}>
                        {day}
                      </div>
                      {open.length > 0 && (
                        <span className="text-[10px] font-semibold text-gray-300 dark:text-od-500 group-hover:text-gray-400 transition-colors">
                          {open.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      {open.slice(0, 3).map(task => {
                        const c = task.task_type_detail?.color ?? '#6366f1'
                        return (
                          <div key={task.id}
                            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md truncate leading-tight font-medium text-gray-700 dark:text-od-200"
                            style={{ backgroundColor: c + '18' }}>
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: c }} />
                            <span className="truncate">{task.title}</span>
                            {task.time && (
                              <span className="flex-shrink-0 text-[9px] text-gray-400 ml-auto">{task.time.slice(0, 5)}</span>
                            )}
                          </div>
                        )
                      })}
                      {open.length > 3 && (
                        <div className="text-[10px] text-gray-400 dark:text-od-400 font-medium pl-1">+{open.length - 3} more</div>
                      )}
                      {done.length > 0 && open.length < 3 && (
                        <div className="text-[10px] text-gray-300 dark:text-od-500 pl-1">{done.length} done</div>
                      )}
                    </div>
                  </div>
                )
              }),
            ]
          })}
        </div>
      ) : (
        <PeriodEditor key={`${year}-${month}`} year={year} month={month + 1} />
      )}

      {/* Fixed month picker */}
      {showMonthPicker && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMonthPicker(false)} />
          <div className="fixed z-20 bg-white dark:bg-od-700 rounded-2xl shadow-2xl border border-gray-100 dark:border-od-600 p-3 w-56"
            style={{ top: monthPickerPos.top, left: monthPickerPos.left }}>
            <div className="grid grid-cols-3 gap-1">
              {MONTHS_SHORT.map((m, i) => (
                <button key={i} onClick={() => { setMonth(i); setShowMonthPicker(false) }}
                  className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    i === month ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-od-200 hover:bg-gray-100 dark:hover:bg-od-700'
                  }`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Fixed year picker */}
      {showYearPicker && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowYearPicker(false)} />
          <div className="fixed z-20 bg-white dark:bg-od-700 rounded-2xl shadow-2xl border border-gray-100 dark:border-od-600 p-3 w-52"
            style={{ top: yearPickerPos.top, left: yearPickerPos.left }}>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <button onClick={() => setYearRangeStart(s => s - 12)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-od-700 text-gray-400 hover:text-gray-700 dark:hover:text-od-100 text-lg transition-colors">‹</button>
              <span className="text-xs font-semibold text-gray-400 dark:text-od-400">{yearRangeStart}–{yearRangeStart + 11}</span>
              <button onClick={() => setYearRangeStart(s => s + 12)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-od-700 text-gray-400 hover:text-gray-700 dark:hover:text-od-100 text-lg transition-colors">›</button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 12 }, (_, i) => yearRangeStart + i).map(y => (
                <button key={y} onClick={() => { setYear(y); setShowYearPicker(false) }}
                  className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    y === year ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-od-200 hover:bg-gray-100 dark:hover:bg-od-700'
                  }`}>
                  {y}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
