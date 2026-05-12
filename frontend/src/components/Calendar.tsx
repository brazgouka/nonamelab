import { useState, useMemo, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchTasks, toggleTask, reorderTasks } from '../api/tasks'
import { fetchPeriodNote, savePeriodNote } from '../api/periodNotes'
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

function dateToStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isoWeekMonday(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4)
  const jan4dow = jan4.getDay() || 7
  const monday = new Date(jan4)
  monday.setDate(jan4.getDate() - (jan4dow - 1) + (week - 1) * 7)
  monday.setHours(0, 0, 0, 0)
  return monday
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

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

  const qc = useQueryClient()
  const [moving, setMoving] = useState(false)
  const [dragKey, setDragKey] = useState<{ date: string; idx: number } | null>(null)
  const [dropKey, setDropKey] = useState<{ date: string; insertPos: number } | null>(null)

  const weekMonday = weekNote ? isoWeekMonday(weekNote.year, weekNote.week) : null
  const weekSunday = weekMonday ? new Date(weekMonday.getTime() + 6 * 86400000) : null
  const weekMondayStr = weekMonday ? dateToStr(weekMonday) : ''
  const weekSundayStr = weekSunday ? dateToStr(weekSunday) : ''

  const { data: weekTasks = [] } = useQuery({
    queryKey: ['tasks', weekMondayStr, weekSundayStr],
    queryFn: () => fetchTasks(weekMondayStr, weekSundayStr),
    enabled: weekNote != null,
  })

  async function handleToggle(task: Task) {
    qc.setQueryData<Task[]>(['tasks', weekMondayStr, weekSundayStr], old =>
      old?.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t) ?? old
    )
    await toggleTask(task.id)
    qc.invalidateQueries({ queryKey: ['tasks'] })
  }

  async function handleMoveToNextWeek() {
    if (!weekNote || moving) return
    setMoving(true)
    try {
      const current = await fetchPeriodNote(weekNote.year, null, weekNote.week)
      const nextMon = new Date(isoWeekMonday(weekNote.year, weekNote.week).getTime() + 7 * 86400000)
      const next = isoWeek(nextMon)
      await savePeriodNote(next.year, null, current.content, next.week)
      qc.invalidateQueries({ queryKey: ['period-note', next.year, null, next.week] })
    } finally {
      setMoving(false)
    }
  }

  function handleDrop(date: string) {
    if (!dragKey || !dropKey || dragKey.date !== date) {
      setDragKey(null); setDropKey(null); return
    }
    const dateTasks = (weekTasksByDate[date] || []).filter(t => !t.is_reminder)
    const reordered = [...dateTasks]
    const [moved] = reordered.splice(dragKey.idx, 1)
    const insertPos = dropKey.insertPos > dragKey.idx ? dropKey.insertPos - 1 : dropKey.insertPos
    reordered.splice(Math.min(insertPos, reordered.length), 0, moved)
    const ids = reordered.map(t => t.id)
    qc.setQueryData<Task[]>(['tasks', weekMondayStr, weekSundayStr], old => {
      if (!old) return old
      const byId = new Map(reordered.map((t, i) => [t.id, { ...t, order: i }]))
      return old.map(t => byId.get(t.id) ?? t)
    })
    reorderTasks(ids)
    qc.invalidateQueries({ queryKey: ['tasks'] })
    setDragKey(null); setDropKey(null)
  }

  const weekTasksByDate: Record<string, Task[]> = {}
  for (const t of weekTasks) {
    if (!weekTasksByDate[t.date]) weekTasksByDate[t.date] = []
    weekTasksByDate[t.date].push(t)
  }

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
          <div className="mr-2 flex items-center gap-1">
            <button
              onClick={() => {
                const mon = isoWeekMonday(weekNote.year, weekNote.week)
                setWeekNote(isoWeek(new Date(mon.getTime() - 7 * 86400000)))
              }}
              className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-od-700 text-gray-400 hover:text-gray-700 dark:hover:text-od-100 transition-colors text-lg font-light leading-none">‹</button>
            <span className="text-xs font-semibold text-gray-700 dark:text-od-200 min-w-[3rem] text-center">W{weekNote.week}</span>
            <button
              onClick={() => {
                const mon = isoWeekMonday(weekNote.year, weekNote.week)
                setWeekNote(isoWeek(new Date(mon.getTime() + 7 * 86400000)))
              }}
              className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-od-700 text-gray-400 hover:text-gray-700 dark:hover:text-od-100 transition-colors text-lg font-light leading-none">›</button>
            <button
              onClick={handleMoveToNextWeek}
              disabled={moving}
              className="ml-1 text-[11px] font-medium text-gray-400 dark:text-od-400 hover:text-blue-500 dark:hover:text-blue-400 border border-gray-200 dark:border-od-500 rounded-md px-2 py-0.5 transition-colors disabled:opacity-40"
              title="Copy notes to next week"
            >{moving ? '…' : '→ Next week'}</button>
          </div>
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
        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/2 overflow-hidden">
            <PeriodEditor key={`week-${weekNote.year}-${weekNote.week}`} year={weekNote.year} month={null} week={weekNote.week} />
          </div>
          <div className="w-1/2 flex-shrink-0 border-l border-gray-100 dark:border-od-600 overflow-y-auto bg-gray-50/50 dark:bg-od-800/50">
            {DAY_NAMES.map((name, i) => {
              const dayDate = new Date(weekMonday!.getTime() + i * 86400000)
              const dateKey = dateToStr(dayDate)
              const dayTasks = weekTasksByDate[dateKey] || []
              const reminders = dayTasks.filter(t => t.is_reminder)
              const regularTasks = dayTasks.filter(t => !t.is_reminder)
              return (
                <div key={i}>
                  {i > 0 && <div className="border-t border-gray-100 dark:border-od-700 mx-4" />}
                  <div className="px-4 py-2.5">
                    <div className="flex items-baseline gap-1.5 mb-1.5">
                      <span className="text-[11px] font-semibold text-gray-500 dark:text-od-300 uppercase tracking-wide">{name}</span>
                      <span className="text-[11px] text-gray-400 dark:text-od-500">{dayDate.getDate()}</span>
                    </div>
                    {reminders.map(t => (
                      <div key={t.id} className="flex items-center gap-2 py-0.5">
                        <svg className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17H9m6-10.5A3 3 0 0 0 9 6.5C9 10.5 7 12 7 12h10s-2-1.5-2-5.5m1.73 5.5C16.88 12.43 17 12 17 11.5M9.27 17a2 2 0 0 0 3.46 0" />
                        </svg>
                        <span className="text-[12px] text-violet-500 dark:text-violet-400 truncate">{t.title}</span>
                      </div>
                    ))}
                    {regularTasks.flatMap((t, ti) => [
                      dropKey?.date === dateKey && dropKey.insertPos === ti
                        ? <div key={`ind-${ti}`} className="h-0.5 mx-2 rounded bg-blue-400 dark:bg-blue-500 my-0.5" />
                        : null,
                      <div
                        key={t.id}
                        draggable
                        onDragStart={() => setDragKey({ date: dateKey, idx: ti })}
                        onDragOver={e => {
                          e.preventDefault()
                          const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                          setDropKey({ date: dateKey, insertPos: e.clientY < r.top + r.height / 2 ? ti : ti + 1 })
                        }}
                        onDrop={() => handleDrop(dateKey)}
                        onDragEnd={() => { setDragKey(null); setDropKey(null) }}
                        className="flex items-center gap-2 py-0.5 group/task rounded"
                      >
                        <svg className="w-2.5 h-2.5 text-gray-300 dark:text-od-600 cursor-grab flex-shrink-0 opacity-0 group-hover/task:opacity-100 transition-opacity" viewBox="0 0 10 16" fill="currentColor">
                          <circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/>
                          <circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
                          <circle cx="2" cy="14" r="1.5"/><circle cx="8" cy="14" r="1.5"/>
                        </svg>
                        <button onClick={() => handleToggle(t)} className="flex items-center gap-2 flex-1 text-left min-w-0">
                          <div className={`w-3 h-3 rounded-full border flex-shrink-0 transition-colors ${
                            t.completed
                              ? 'bg-gray-300 border-gray-300 dark:bg-od-500 dark:border-od-500'
                              : 'border-gray-300 dark:border-od-500 group-hover/task:border-gray-400 dark:group-hover/task:border-od-400'
                          }`} />
                          <span className={`text-[12px] truncate ${
                            t.completed
                              ? 'line-through text-gray-300 dark:text-od-600'
                              : 'text-gray-600 dark:text-od-300 group-hover/task:text-gray-800 dark:group-hover/task:text-od-100'
                          }`}>{t.title}</span>
                        </button>
                      </div>,
                    ])}
                    {dropKey?.date === dateKey && dropKey.insertPos === regularTasks.length && (
                      <div className="h-0.5 mx-2 rounded bg-blue-400 dark:bg-blue-500 my-0.5" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
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
