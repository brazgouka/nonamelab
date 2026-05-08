import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchTasks } from '../api/tasks'
import type { Task } from '../types'
import PeriodPanel from './PeriodPanel'

interface Props {
  onSelectDate: (date: string) => void
  filterTypeId: number | null
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function Calendar({ onSelectDate, filterTypeId }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [showPicker, setShowPicker] = useState(false)
  const [pickerYear, setPickerYear] = useState(year)
  const [showNotes, setShowNotes] = useState(false)

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startDate = toDateStr(year, month, 1)
  const endDate = toDateStr(year, month, daysInMonth)

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks', startDate, endDate],
    queryFn: () => fetchTasks(startDate, endDate),
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

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  function openPicker() { setPickerYear(year); setShowPicker(true) }
  function selectMonth(m: number) { setMonth(m); setYear(pickerYear); setShowPicker(false) }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <button onClick={prevMonth}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors text-2xl font-light leading-none">
            ‹
          </button>

          {showPicker ? (
            <div className="flex-1 mx-4">
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setPickerYear(y => y - 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 text-lg transition-colors">‹</button>
                <span className="text-base font-semibold text-gray-900 select-none">{pickerYear}</span>
                <button onClick={() => setPickerYear(y => y + 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 text-lg transition-colors">›</button>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {MONTHS_SHORT.map((m, i) => (
                  <button key={i} onClick={() => selectMonth(i)}
                    className={`py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      i === month && pickerYear === year
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowPicker(false)}
                className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={openPicker}
              className="flex flex-col items-center select-none hover:opacity-70 transition-opacity group">
              <span className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {MONTHS[month]}
              </span>
              <span className="text-sm text-gray-400">{year}</span>
            </button>
          )}

          <div className="flex items-center gap-1">
            {!showPicker && (
              <button
                onClick={() => setShowNotes(true)}
                title="Notes & To-do for this month"
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            <button onClick={nextMonth}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors text-2xl font-light leading-none">
              ›
            </button>
          </div>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/60">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-3 uppercase tracking-widest">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7">
          {blanks.map((_, i) => (
            <div key={`b${i}`} className="min-h-[10rem] border-b border-r border-gray-100 bg-gray-50/30" />
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
              <div
                key={day}
                onClick={() => onSelectDate(ds)}
                className={`relative min-h-[10rem] border-b border-r border-gray-100 last:border-r-0 p-2.5 cursor-pointer group transition-colors ${
                  isToday
                    ? 'bg-blue-50/70 hover:bg-blue-50'
                    : isWeekend
                    ? 'bg-gray-50/60 hover:bg-gray-100/60'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm transition-colors select-none ${
                    isToday
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : isWeekend
                      ? 'text-gray-400 font-medium'
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

                <div className="space-y-1">
                  {open.slice(0, 4).map(task => {
                    const c = task.task_type_detail?.color ?? '#6366f1'
                    return (
                      <div key={task.id}
                        className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg truncate leading-tight font-medium"
                        style={{ backgroundColor: c + '15', color: '#374151' }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: c }} />
                        <span className="truncate">{task.title}</span>
                        {task.time && (
                          <span className="flex-shrink-0 text-[10px] text-gray-400 ml-auto">{task.time.slice(0, 5)}</span>
                        )}
                      </div>
                    )
                  })}
                  {open.length > 4 && (
                    <div className="text-[11px] text-gray-400 font-medium pl-1">+{open.length - 4} more</div>
                  )}
                  {done.length > 0 && open.length < 4 && (
                    <div className="text-[11px] text-gray-300 pl-1">{done.length} completed</div>
                  )}
                </div>

                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-gray-300">+</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showNotes && (
        <PeriodPanel year={year} month={month + 1} onClose={() => setShowNotes(false)} />
      )}
    </>
  )
}
