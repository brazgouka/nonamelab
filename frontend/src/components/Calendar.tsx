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

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function Calendar({ onSelectDate, filterTypeId }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [view, setView] = useState<View>('calendar')
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

  const firstDow = new Date(year, month, 1).getDay()
  const blanks = Array.from({ length: firstDow })
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  function openMonthPicker() {
    if (monthBtnRef.current) {
      const r = monthBtnRef.current.getBoundingClientRect()
      setMonthPickerPos({ top: r.bottom + 8, left: r.left })
    }
    setShowMonthPicker(true)
    setShowYearPicker(false)
  }

  function openYearPicker() {
    if (yearBtnRef.current) {
      const r = yearBtnRef.current.getBoundingClientRect()
      setYearPickerPos({ top: r.bottom + 8, left: r.left })
    }
    setYearRangeStart(Math.floor(year / 12) * 12)
    setShowYearPicker(true)
    setShowMonthPicker(false)
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-1 px-4 py-3.5 border-b border-gray-100 flex-shrink-0">
        <button onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors text-xl font-light leading-none flex-shrink-0">
          ‹
        </button>

        <button ref={monthBtnRef} onClick={openMonthPicker}
          className="px-2 py-1.5 rounded-xl hover:bg-gray-100 transition-colors text-base font-semibold text-gray-900">
          {MONTHS[month]}
        </button>

        <button ref={yearBtnRef} onClick={openYearPicker}
          className="px-2 py-1.5 rounded-xl hover:bg-gray-100 transition-colors text-base font-semibold text-gray-500">
          {year}
        </button>

        <button onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors text-xl font-light leading-none flex-shrink-0">
          ›
        </button>

        <div className="flex-1" />

        <div className="flex bg-gray-100 rounded-xl p-0.5">
          {(['calendar', 'notes'] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${
                view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}>
              {v === 'notes' ? 'Notes' : 'Calendar'}
            </button>
          ))}
        </div>
      </div>

      {view === 'calendar' ? (
        <>
          {/* Day labels */}
          <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/60 flex-shrink-0">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2.5 uppercase tracking-widest">
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex-1 grid grid-cols-7" style={{ gridAutoRows: '1fr' }}>
            {blanks.map((_, i) => (
              <div key={`b${i}`} className="border-b border-r border-gray-100 bg-gray-50/30" />
            ))}
            {days.map(day => {
              const ds = toDateStr(year, month, day)
              const dayTasks = tasksByDate[ds] || []
              const open = dayTasks.filter(t => !t.completed)
              const done = dayTasks.filter(t => t.completed)
              const isToday = ds === todayStr
              const dow = new Date(ds + 'T00:00:00').getDay()
              const isWeekend = dow === 0 || dow === 6

              return (
                <div key={day} onClick={() => onSelectDate(ds)}
                  className={`relative border-b border-r border-gray-100 last:border-r-0 p-2 cursor-pointer group transition-colors flex flex-col ${
                    isToday ? 'bg-blue-50/70 hover:bg-blue-50'
                    : isWeekend ? 'bg-gray-50/60 hover:bg-gray-100/60'
                    : 'hover:bg-slate-50'
                  }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs transition-colors select-none ${
                      isToday ? 'bg-blue-600 text-white font-bold shadow-sm'
                      : isWeekend ? 'text-gray-400 font-medium'
                      : 'text-gray-600 font-medium group-hover:bg-white'
                    }`}>
                      {day}
                    </div>
                    {open.length > 0 && (
                      <span className="text-[10px] font-semibold text-gray-300 group-hover:text-gray-400 transition-colors">
                        {open.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {open.slice(0, 3).map(task => {
                      const c = task.task_type_detail?.color ?? '#6366f1'
                      return (
                        <div key={task.id}
                          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md truncate leading-tight font-medium"
                          style={{ backgroundColor: c + '18', color: '#374151' }}>
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: c }} />
                          <span className="truncate">{task.title}</span>
                          {task.time && (
                            <span className="flex-shrink-0 text-[9px] text-gray-400 ml-auto">{task.time.slice(0, 5)}</span>
                          )}
                        </div>
                      )
                    })}
                    {open.length > 3 && (
                      <div className="text-[10px] text-gray-400 font-medium pl-1">+{open.length - 3} more</div>
                    )}
                    {done.length > 0 && open.length < 3 && (
                      <div className="text-[10px] text-gray-300 pl-1">{done.length} done</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <PeriodEditor key={`${year}-${month}`} year={year} month={month + 1} />
      )}

      {/* Fixed month picker */}
      {showMonthPicker && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMonthPicker(false)} />
          <div className="fixed z-20 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 w-56"
            style={{ top: monthPickerPos.top, left: monthPickerPos.left }}>
            <div className="grid grid-cols-3 gap-1">
              {MONTHS_SHORT.map((m, i) => (
                <button key={i}
                  onClick={() => { setMonth(i); setShowMonthPicker(false) }}
                  className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    i === month ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
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
          <div className="fixed z-20 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 w-52"
            style={{ top: yearPickerPos.top, left: yearPickerPos.left }}>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <button onClick={() => setYearRangeStart(s => s - 12)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 text-lg transition-colors">‹</button>
              <span className="text-xs font-semibold text-gray-400">{yearRangeStart}–{yearRangeStart + 11}</span>
              <button onClick={() => setYearRangeStart(s => s + 12)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 text-lg transition-colors">›</button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 12 }, (_, i) => yearRangeStart + i).map(y => (
                <button key={y}
                  onClick={() => { setYear(y); setShowYearPicker(false) }}
                  className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    y === year ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
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
