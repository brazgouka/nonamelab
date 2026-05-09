import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTasks, deleteTask, toggleTask } from '../api/tasks'
import type { Task, DeleteScope } from '../types'
import TaskCard from './TaskCard'
import TaskForm from './TaskForm'
import DeleteModal from './DeleteModal'

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

export default function TodayPage() {
  const todayDate = dateStr(new Date())
  const [viewDate, setViewDate] = useState(todayDate)
  const isToday = viewDate === todayDate

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

  function openEdit(task: Task) { setEditingTask(task); setShowForm(true) }
  function closeForm() { setShowForm(false); setEditingTask(null) }

  const reminders = tasks.filter(t => t.is_reminder)
  const open = tasks.filter(t => !t.completed && !t.is_reminder)
  const done = tasks.filter(t => t.completed && !t.is_reminder)

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 dark:text-od-100">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1 h-5">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isToday ? 'bg-blue-500' : 'bg-gray-400'}`} />
          <p className={`text-xs font-semibold uppercase tracking-widest ${isToday ? 'text-blue-500' : 'text-gray-400 dark:text-od-400'}`}>
            {isToday ? 'Today' : viewDate === addDays(todayDate, -1) ? 'Yesterday' : viewDate === addDays(todayDate, 1) ? 'Tomorrow' : 'Viewing'}
          </p>
          <button
            onClick={() => setViewDate(todayDate)}
            className={`ml-1 px-2 py-0.5 text-[11px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors ${isToday ? 'invisible' : ''}`}
          >
            Jump to today
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewDate(d => addDays(d, -1))}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-od-700 text-gray-400 hover:text-gray-700 dark:hover:text-od-100 transition-colors text-xl font-light leading-none flex-shrink-0"
          >
            ‹
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-od-100 flex-1">{formatDate(viewDate)}</h1>
          <button
            onClick={() => setViewDate(d => addDays(d, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-od-700 text-gray-400 hover:text-gray-700 dark:hover:text-od-100 transition-colors text-xl font-light leading-none flex-shrink-0"
          >
            ›
          </button>
        </div>

        <p className="text-sm text-gray-400 dark:text-od-400 mt-1 pl-11 h-5">
          {!isLoading && (tasks.length === 0
            ? 'Nothing scheduled'
            : [open.length > 0 && `${open.length} open`, done.length > 0 && `${done.length} done`, reminders.length > 0 && `${reminders.length} reminder${reminders.length > 1 ? 's' : ''}`].filter(Boolean).join(' · '))}
        </p>
      </div>

      {/* Task list */}
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
              <p className="text-[11px] font-semibold text-violet-400 dark:text-violet-500 uppercase tracking-widest pb-1 pl-1">
                Reminders
              </p>
              {reminders.map(task => (
                <TaskCard key={task.id} task={task}
                  onToggle={() => {}}
                  onEdit={() => openEdit(task)}
                  onDelete={() => setPendingDelete(task)}
                />
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
              <p className="text-[11px] font-semibold text-gray-300 dark:text-od-500 uppercase tracking-widest pt-6 pb-1 pl-1">
                Completed
              </p>
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

      {/* Add task button */}
      <div className="mt-6">
        <button
          onClick={() => { setEditingTask(null); setShowForm(true) }}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl py-3 text-sm font-semibold transition-colors shadow-sm"
        >
          <span className="text-lg leading-none">+</span> Add task
        </button>
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
