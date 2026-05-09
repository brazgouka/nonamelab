import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTasks, deleteTask, toggleTask } from '../api/tasks'
import type { Task, DeleteScope } from '../types'
import TaskCard from './TaskCard'
import TaskForm from './TaskForm'
import DeleteModal from './DeleteModal'

interface Props {
  date: string
  onClose: () => void
}

function formatDate(ds: string): string {
  const d = new Date(ds + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export default function DayPanel({ date, onClose }: Props) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null)

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', date, date],
    queryFn: () => fetchTasks(date, date),
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

  const open = tasks.filter(t => !t.completed)
  const done = tasks.filter(t => t.completed)

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-od-800 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-od-600">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-od-100">{formatDate(date)}</h2>
              <p className="text-xs text-gray-400 dark:text-od-400 mt-0.5">
                {tasks.length === 0
                  ? 'No tasks'
                  : `${open.length} open${done.length > 0 ? ` · ${done.length} done` : ''}`}
              </p>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-od-700 text-gray-400 hover:text-gray-700 dark:hover:text-od-100 transition-colors text-xl leading-none mt-0.5">
              ×
            </button>
          </div>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <div className="w-14 h-14 bg-gray-100 dark:bg-od-700 rounded-2xl flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-400 dark:text-od-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-400 dark:text-od-400">Nothing scheduled</p>
              <p className="text-xs text-gray-300 dark:text-od-500 mt-1">Tap below to add a task</p>
            </div>
          ) : (
            <div className="space-y-2">
              {open.map(task => (
                <TaskCard key={task.id} task={task}
                  onToggle={() => toggleMutation.mutate(task.id)}
                  onEdit={() => openEdit(task)}
                  onDelete={() => setPendingDelete(task)}
                />
              ))}
              {done.length > 0 && (
                <>
                  <p className="text-[11px] font-semibold text-gray-300 dark:text-od-500 uppercase tracking-widest pt-4 pb-1 pl-1">
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
        </div>

        {/* Add task button */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-od-600 bg-white dark:bg-od-800">
          <button
            onClick={() => { setEditingTask(null); setShowForm(true) }}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl py-3 text-sm font-semibold transition-colors shadow-sm"
          >
            <span className="text-lg leading-none">+</span> Add task
          </button>
        </div>
      </div>

      {showForm && (
        <TaskForm date={date} task={editingTask ?? undefined} onClose={closeForm}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['tasks'] }); closeForm() }}
        />
      )}

      {pendingDelete && (
        <DeleteModal task={pendingDelete} onClose={() => setPendingDelete(null)}
          onConfirm={scope => deleteMutation.mutate({ id: pendingDelete.id, scope })}
          isLoading={deleteMutation.isPending}
        />
      )}
    </>
  )
}
