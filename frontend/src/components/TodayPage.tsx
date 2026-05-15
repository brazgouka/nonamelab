import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { fetchTasks, deleteTask, toggleTask } from '../api/tasks'
import type { Task, DeleteScope } from '../types'
import TaskCard from './TaskCard'
import TaskForm from './TaskForm'
import DeleteModal from './DeleteModal'
import PeriodSection from './PeriodSection'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_LABELS = ['Mo','Tu','We','Th','Fr','Sa','Su']

function isoWeekInfo(d: Date): { week: number; year: number } {
  const tmp = new Date(d)
  tmp.setHours(0, 0, 0, 0)
  tmp.setDate(tmp.getDate() + 3 - (tmp.getDay() + 6) % 7)
  const jan4 = new Date(tmp.getFullYear(), 0, 4)
  return {
    week: 1 + Math.round(((tmp.getTime() - jan4.getTime()) / 86400000 - 3 + (jan4.getDay() + 6) % 7) / 7),
    year: tmp.getFullYear(),
  }
}

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDate(ds: string): string {
  return new Date(ds + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

function addDays(ds: string, n: number): string {
  const d = new Date(ds + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return dateStr(d)
}

function MiniCalendar({ selected, today, onSelect, onClose }: {
  selected: string; today: string; onSelect: (d: string) => void; onClose: () => void
}) {
  const selDate = new Date(selected + 'T00:00:00')
  const [viewYear, setViewYear] = useState(selDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(selDate.getMonth())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [onClose])

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  // Build calendar grid (Mon-first)
  const firstDay = new Date(viewYear, viewMonth, 1)
  const startDow = (firstDay.getDay() + 6) % 7  // 0=Mon
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div ref={ref}
      className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-od-800 border border-gray-200 dark:border-od-600 rounded-2xl shadow-2xl p-4 w-72 select-none"
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-od-700 text-gray-400 hover:text-gray-700 dark:hover:text-od-100 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-800 dark:text-od-100">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-od-700 text-gray-400 hover:text-gray-700 dark:hover:text-od-100 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-400 dark:text-od-500 uppercase py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isSel = ds === selected
          const isTod = ds === today
          return (
            <button key={i} onClick={() => { onSelect(ds); onClose() }}
              className={`
                aspect-square rounded-lg text-xs font-medium transition-all
                ${isSel ? 'bg-blue-600 text-white shadow-sm' :
                  isTod ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-semibold ring-1 ring-blue-300 dark:ring-blue-700' :
                  'hover:bg-gray-100 dark:hover:bg-od-700 text-gray-700 dark:text-od-200'}
              `}>
              {day}
            </button>
          )
        })}
      </div>

      {/* Go to today */}
      {selected !== today && (
        <button onClick={() => { onSelect(today); onClose() }}
          className="mt-3 w-full text-xs font-semibold text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
          Go to today
        </button>
      )}
    </div>
  )
}

export default function TodayPage() {
  const todayDate = dateStr(new Date())
  const [searchParams, setSearchParams] = useSearchParams()
  const viewDate = searchParams.get('date') || todayDate
  const { week: isoWeek, year: isoYear } = useMemo(() => isoWeekInfo(new Date()), [])
  const calYear = new Date().getFullYear()
  const calMonth = new Date().getMonth() + 1
  const isToday = viewDate === todayDate
  const [showPicker, setShowPicker] = useState(false)

  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null)

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', viewDate, viewDate],
    queryFn: () => fetchTasks(viewDate, viewDate),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, scope }: { id: number; scope: DeleteScope }) => deleteTask(id, scope),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setPendingDelete(null) },
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => toggleTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  function navigateTo(date: string) {
    setShowPicker(false)
    if (date === todayDate) setSearchParams({})
    else setSearchParams({ date })
  }

  function openEdit(task: Task) { setEditingTask(task); setShowForm(true) }
  function closeForm() { setShowForm(false); setEditingTask(null) }

  const reminders = tasks.filter(t => t.is_reminder)
  const open = tasks.filter(t => !t.completed && !t.is_reminder)
  const done = tasks.filter(t => t.completed && !t.is_reminder)

  const viewDateObj = new Date(viewDate + 'T00:00:00')
  const dayLabel = isToday ? 'Today'
    : viewDate === addDays(todayDate, -1) ? 'Yesterday'
    : viewDate === addDays(todayDate, 1) ? 'Tomorrow'
    : `${MONTHS_SHORT[viewDateObj.getMonth()]} ${viewDateObj.getFullYear()}`

  return (
    <div className="dark:text-od-100">
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1 h-5">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isToday ? 'bg-blue-500' : 'bg-gray-400'}`} />
          <p className={`text-xs font-semibold uppercase tracking-widest ${isToday ? 'text-blue-500' : 'text-gray-400 dark:text-od-400'}`}>
            {dayLabel}
          </p>
          <button
            onClick={() => navigateTo(todayDate)}
            className={`ml-1 px-2 py-0.5 text-[11px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors ${isToday ? 'invisible' : ''}`}
          >
            Jump to today
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo(addDays(viewDate, -1))}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-od-700 text-gray-400 hover:text-gray-700 dark:hover:text-od-100 transition-colors flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="relative flex-1">
            <button
              onClick={() => setShowPicker(p => !p)}
              className="group flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-od-700/50 rounded-xl px-2 py-1 -ml-2 transition-colors"
            >
              <h1 className="text-2xl font-bold text-gray-900 dark:text-od-100">{formatDate(viewDate)}</h1>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                className="text-gray-300 dark:text-od-500 group-hover:text-gray-500 dark:group-hover:text-od-300 transition-colors flex-shrink-0 mt-0.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </button>
            {showPicker && (
              <MiniCalendar
                selected={viewDate}
                today={todayDate}
                onSelect={navigateTo}
                onClose={() => setShowPicker(false)}
              />
            )}
          </div>

          <button
            onClick={() => navigateTo(addDays(viewDate, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-od-700 text-gray-400 hover:text-gray-700 dark:hover:text-od-100 transition-colors flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-400 dark:text-od-400 mt-1 pl-11 h-5">
          {!isLoading && (tasks.length === 0
            ? 'Nothing scheduled'
            : [open.length > 0 && `${open.length} open`, done.length > 0 && `${done.length} done`, reminders.length > 0 && `${reminders.length} reminder${reminders.length > 1 ? 's' : ''}`].filter(Boolean).join(' · '))}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-od-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-base font-semibold text-gray-400 dark:text-od-400">All clear!</p>
          <p className="text-sm text-gray-300 dark:text-od-500 mt-1">No tasks for this day</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reminders.length > 0 && (
            <>
              <p className="text-[11px] font-semibold text-violet-400 dark:text-violet-500 uppercase tracking-widest pb-1 pl-1">Reminders</p>
              {reminders.map(task => (
                <TaskCard key={task.id} task={task} onToggle={() => {}} onEdit={() => openEdit(task)} onDelete={() => setPendingDelete(task)} />
              ))}
            </>
          )}
          {open.map(task => (
            <TaskCard key={task.id} task={task}
              onToggle={() => toggleMutation.mutate(task.id)}
              onEdit={() => openEdit(task)}
              onDelete={() => setPendingDelete(task)}
            />
          ))}
          {done.length > 0 && (
            <>
              <p className="text-[11px] font-semibold text-gray-300 dark:text-od-500 uppercase tracking-widest pt-6 pb-1 pl-1">Completed</p>
              {done.map(task => (
                <TaskCard key={task.id} task={task}
                  onToggle={() => toggleMutation.mutate(task.id)}
                  onEdit={() => openEdit(task)}
                  onDelete={() => setPendingDelete(task)}
                />
              ))}
            </>
          )}
        </div>
      )}

      <div className="mt-6">
        <button
          onClick={() => { setEditingTask(null); setShowForm(true) }}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl py-3 text-sm font-semibold transition-colors shadow-sm"
        >
          <span className="text-lg leading-none">+</span> Add task
        </button>
      </div>
    </div>

    <div className="px-6 pb-10 space-y-4">
      <PeriodSection label={`Week ${isoWeek}`} year={isoYear} month={null} week={isoWeek} />
      <PeriodSection label={`${MONTHS[calMonth - 1]} ${calYear}`} year={calYear} month={calMonth} />
    </div>

    {showForm && (
      <TaskForm date={viewDate} task={editingTask ?? undefined} onClose={closeForm}
        onSaved={() => { qc.invalidateQueries({ queryKey: ['tasks'] }); closeForm() }}
      />
    )}
    {pendingDelete && (
      <DeleteModal task={pendingDelete} onClose={() => setPendingDelete(null)}
        onConfirm={scope => deleteMutation.mutate({ id: pendingDelete.id, scope })}
        isLoading={deleteMutation.isPending}
      />
    )}
    </div>
  )
}
