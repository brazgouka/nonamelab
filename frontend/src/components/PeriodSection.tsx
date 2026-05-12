import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import PeriodEditor from './PeriodEditor'
import { fetchTasks, reorderTasks } from '../api/tasks'
import type { Task } from '../types'

interface Props {
  label: string
  year: number
  month: number | null
  week?: number | null
}

function isoWeekMonday(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4)
  const jan4dow = jan4.getDay() || 7
  const monday = new Date(jan4)
  monday.setDate(jan4.getDate() - (jan4dow - 1) + (week - 1) * 7)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function PeriodSection({ label, year, month, week }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [dragKey, setDragKey] = useState<{ date: string; idx: number } | null>(null)
  const [dropKey, setDropKey] = useState<{ date: string; insertPos: number } | null>(null)
  const qc = useQueryClient()

  const isWeek = week != null
  const monday = isWeek ? isoWeekMonday(year, week!) : null
  const sunday = monday ? new Date(monday.getTime() + 6 * 86400000) : null
  const mondayStr = monday ? toDateStr(monday) : ''
  const sundayStr = sunday ? toDateStr(sunday) : ''

  const { data: weekTasks = [] } = useQuery({
    queryKey: ['tasks', mondayStr, sundayStr],
    queryFn: () => fetchTasks(mondayStr, sundayStr),
    enabled: isWeek && !collapsed,
  })

  const tasksByDate: Record<string, Task[]> = {}
  for (const t of weekTasks) {
    if (!tasksByDate[t.date]) tasksByDate[t.date] = []
    tasksByDate[t.date].push(t)
  }

  function handleDrop(date: string) {
    if (!dragKey || !dropKey || dragKey.date !== date) {
      setDragKey(null); setDropKey(null); return
    }
    const dateTasks = (tasksByDate[date] || []).filter(t => !t.is_reminder)
    const reordered = [...dateTasks]
    const [moved] = reordered.splice(dragKey.idx, 1)
    const insertPos = dropKey.insertPos > dragKey.idx ? dropKey.insertPos - 1 : dropKey.insertPos
    reordered.splice(Math.min(insertPos, reordered.length), 0, moved)
    const ids = reordered.map(t => t.id)
    qc.setQueryData<Task[]>(['tasks', mondayStr, sundayStr], old => {
      if (!old) return old
      const byId = new Map(reordered.map((t, i) => [t.id, { ...t, order: i }]))
      return old.map(t => byId.get(t.id) ?? t)
    })
    reorderTasks(ids)
    qc.invalidateQueries({ queryKey: ['tasks'] })
    setDragKey(null); setDropKey(null)
  }

  return (
    <div className="border border-gray-100 dark:border-od-600 rounded-2xl overflow-hidden">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-od-700/50 hover:bg-gray-100 dark:hover:bg-od-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-400 dark:text-od-400 uppercase tracking-widest">{label}</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-300 dark:text-od-500 transition-transform ${collapsed ? '' : 'rotate-180'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>

      {!collapsed && (
        isWeek && monday ? (
          <div className="flex h-[420px]">
            {/* Left: editor */}
            <div className="flex-1 overflow-hidden">
              <PeriodEditor year={year} month={month} week={week} />
            </div>
            {/* Right: weekday sidebar */}
            <div className="w-56 flex-shrink-0 border-l border-gray-100 dark:border-od-600 overflow-y-auto bg-gray-50/50 dark:bg-od-800/50">
              {DAY_NAMES.map((name, i) => {
                const dayDate = new Date(monday.getTime() + i * 86400000)
                const dateKey = toDateStr(dayDate)
                const dayTasks = tasksByDate[dateKey] || []
                const reminders = dayTasks.filter(t => t.is_reminder)
                const regularTasks = dayTasks.filter(t => !t.is_reminder)

                return (
                  <div key={i}>
                    {i > 0 && <div className="border-t border-gray-100 dark:border-od-700 mx-3" />}
                    <div className="px-3 py-2">
                      <div className="flex items-baseline gap-1.5 mb-1">
                        <span className="text-[11px] font-semibold text-gray-500 dark:text-od-300">{name}</span>
                        <span className="text-[11px] text-gray-400 dark:text-od-500">{dayDate.getDate()}</span>
                      </div>
                      {reminders.map(t => (
                        <div key={t.id} className="flex items-center gap-1.5 py-0.5">
                          <svg className="w-3 h-3 text-violet-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17H9m6-10.5A3 3 0 0 0 9 6.5C9 10.5 7 12 7 12h10s-2-1.5-2-5.5m1.73 5.5C16.88 12.43 17 12 17 11.5M9.27 17a2 2 0 0 0 3.46 0" />
                          </svg>
                          <span className="text-[11px] text-gray-500 dark:text-od-400 truncate">{t.title}</span>
                        </div>
                      ))}
                      {regularTasks.flatMap((t, ti) => [
                        dropKey?.date === dateKey && dropKey.insertPos === ti
                          ? <div key={`ind-${ti}`} className="h-0.5 mx-1 rounded bg-blue-400 dark:bg-blue-500 my-0.5" />
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
                          className="flex items-center gap-1.5 py-0.5 group/task rounded"
                        >
                          <svg className="w-2.5 h-2.5 text-gray-300 dark:text-od-600 cursor-grab flex-shrink-0 opacity-0 group-hover/task:opacity-100 transition-opacity" viewBox="0 0 10 16" fill="currentColor">
                            <circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/>
                            <circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
                            <circle cx="2" cy="14" r="1.5"/><circle cx="8" cy="14" r="1.5"/>
                          </svg>
                          <div className={`w-2.5 h-2.5 rounded-full border flex-shrink-0 ${t.completed ? 'bg-gray-300 border-gray-300 dark:bg-od-500 dark:border-od-500' : 'border-gray-300 dark:border-od-500'}`} />
                          <span className={`text-[11px] truncate ${t.completed ? 'line-through text-gray-300 dark:text-od-600' : 'text-gray-500 dark:text-od-400'}`}>{t.title}</span>
                        </div>,
                      ])}
                      {dropKey?.date === dateKey && dropKey.insertPos === regularTasks.length && (
                        <div className="h-0.5 mx-1 rounded bg-blue-400 dark:bg-blue-500 my-0.5" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="h-80">
            <PeriodEditor year={year} month={month} week={week} />
          </div>
        )
      )}
    </div>
  )
}
