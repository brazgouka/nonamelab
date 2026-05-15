import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createTask, updateTask } from '../api/tasks'
import { fetchTaskTypes } from '../api/taskTypes'
import type { Task, DeleteScope } from '../types'
import DatePicker from './DatePicker'

interface Props {
  date: string
  task?: Task
  onClose: () => void
  onSaved: () => void
}

type Priority = 'low' | 'medium' | 'high'
type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

interface FormState {
  title: string
  description: string
  date: string
  time: string
  priority: Priority | null
  task_type: number | null
  is_reminder: boolean
  recurrence: Recurrence
  recurrence_days: number[]
  recurrence_end_date: string
}

const PRIORITY_OPTS = [
  { value: 'low'    as Priority, label: 'Low',    on: 'bg-emerald-50 border-emerald-400 text-emerald-700', dot: 'bg-emerald-400' },
  { value: 'medium' as Priority, label: 'Medium', on: 'bg-amber-50 border-amber-400 text-amber-700',       dot: 'bg-amber-400' },
  { value: 'high'   as Priority, label: 'High',   on: 'bg-red-50 border-red-400 text-red-700',             dot: 'bg-red-500' },
]

const RECURRENCE_OPTS = [
  { value: 'none'    as Recurrence, label: 'Once' },
  { value: 'daily'   as Recurrence, label: 'Daily' },
  { value: 'weekly'  as Recurrence, label: 'Weekly' },
  { value: 'monthly' as Recurrence, label: 'Monthly' },
  { value: 'yearly'  as Recurrence, label: 'Yearly' },
]

// 0 = Monday … 6 = Sunday (Python weekday() convention)
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const defaultEndDate = () => `${new Date().getFullYear()}-12-31`

const inputCls = 'w-full border border-gray-200 dark:border-od-600 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-od-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors placeholder:text-gray-400 dark:placeholder:text-od-400 bg-white dark:bg-od-700'

export default function TaskForm({ date, task, onClose, onSaved }: Props) {
  const { data: taskTypes = [] } = useQuery({ queryKey: ['task-types'], queryFn: fetchTaskTypes })

  const [editScope, setEditScope] = useState<DeleteScope>('instance')

  const [form, setForm] = useState<FormState>({
    title: task?.title ?? '',
    description: task?.description ?? '',
    date: task?.date ?? date,
    time: task?.time ?? '',
    priority: task?.priority ?? null,
    task_type: task?.task_type ?? null,
    is_reminder: task?.is_reminder ?? false,
    recurrence: task?.recurrence ?? 'none',
    recurrence_days: task?.recurrence_days ?? [],
    recurrence_end_date: task?.recurrence_end_date ?? defaultEndDate(),
  })

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        time: form.time || null,
        priority: form.is_reminder ? null : form.priority,
        recurrence_days: form.recurrence === 'weekly' && form.recurrence_days.length > 0
          ? form.recurrence_days
          : null,
        recurrence_end_date: form.recurrence_end_date || null,
      }
      return task ? updateTask(task.id, payload, task.series_id ? editScope : undefined) : createTask(payload)
    },
    onSuccess: onSaved,
  })

  function field<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function toggleDay(day: number) {
    setForm(f => ({
      ...f,
      recurrence_days: f.recurrence_days.includes(day)
        ? f.recurrence_days.filter(d => d !== day)
        : [...f.recurrence_days, day].sort((a, b) => a - b),
    }))
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-od-800 rounded-2xl shadow-2xl z-[70] flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-od-600">
          <h3 className="text-base font-semibold text-gray-900 dark:text-od-100">{task ? 'Edit task' : 'New task'}</h3>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-od-700 text-gray-400 hover:text-gray-700 dark:hover:text-od-100 transition-colors text-xl leading-none">
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <input
            type="text"
            placeholder="What needs to be done?"
            value={form.title}
            onChange={e => field('title', e.target.value)}
            required
            autoFocus
            className={`${inputCls} text-base font-medium`}
          />

          {/* Reminder toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => field('is_reminder', !form.is_reminder)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                form.is_reminder
                  ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300'
                  : 'border-gray-200 dark:border-od-600 text-gray-400 dark:text-od-400 bg-white dark:bg-od-700 hover:border-gray-300'
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              Reminder
            </button>
            {form.is_reminder && (
              <span className="text-xs text-gray-400 dark:text-od-400">No completion required</span>
            )}
          </div>

          <textarea
            placeholder="Add a note…"
            value={form.description}
            onChange={e => field('description', e.target.value)}
            rows={2}
            className={`${inputCls} resize-none`}
          />

          {/* Date + time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 dark:text-od-400 mb-1.5 uppercase tracking-wide">Date</label>
              <DatePicker value={form.date} onChange={d => field('date', d)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 dark:text-od-400 mb-1.5 uppercase tracking-wide">Time</label>
              <input type="time" value={form.time} onChange={e => field('time', e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Priority — hidden for reminders */}
          {!form.is_reminder && <div>
            <label className="block text-xs font-semibold text-gray-400 dark:text-od-400 mb-2 uppercase tracking-wide">Priority</label>
            <div className="grid grid-cols-4 gap-2">
              <button type="button" onClick={() => field('priority', null)}
                className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                  form.priority === null
                    ? 'bg-gray-100 dark:bg-od-700 border-gray-300 dark:border-od-600 text-gray-600 dark:text-od-200'
                    : 'border-gray-200 dark:border-od-600 text-gray-300 dark:text-od-500 hover:border-gray-300 hover:text-gray-500 bg-white dark:bg-od-700'
                }`}>
                None
              </button>
              {PRIORITY_OPTS.map(p => (
                <button key={p.value} type="button" onClick={() => field('priority', p.value)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all flex items-center justify-center gap-1.5 ${
                    form.priority === p.value ? p.on : 'border-gray-200 dark:border-od-600 text-gray-400 dark:text-od-400 hover:border-gray-300 hover:text-gray-600 bg-white dark:bg-od-700'
                  }`}>
                  <span className={`w-2 h-2 rounded-full ${form.priority === p.value ? p.dot : 'bg-gray-200'}`} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>}

          {/* Type */}
          {taskTypes.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 dark:text-od-400 mb-2 uppercase tracking-wide">Type</label>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => field('task_type', null)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                    !form.task_type
                      ? 'bg-gray-900 dark:bg-od-100 text-white dark:text-od-900 border-gray-900 dark:border-od-100'
                      : 'border-gray-200 dark:border-od-600 text-gray-400 dark:text-od-400 hover:border-gray-300 hover:text-gray-600 bg-white dark:bg-od-700'
                  }`}>
                  None
                </button>
                {taskTypes.map(tt => (
                  <button key={tt.id} type="button" onClick={() => field('task_type', tt.id)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all"
                    style={
                      form.task_type === tt.id
                        ? { backgroundColor: tt.color, borderColor: tt.color, color: '#fff' }
                        : { borderColor: tt.color + '60', color: tt.color, backgroundColor: tt.color + '12' }
                    }>
                    {tt.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recurrence (new tasks only) */}
          {!task && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 dark:text-od-400 mb-2 uppercase tracking-wide">Repeat</label>
              <div className="grid grid-cols-5 gap-1.5">
                {RECURRENCE_OPTS.map(r => (
                  <button key={r.value} type="button"
                    onClick={() => {
                      if (r.value === 'yearly') {
                        const base = new Date(form.date || new Date())
                        const y = base.getFullYear() + 100
                        const mm = String(base.getMonth() + 1).padStart(2, '0')
                        const dd = String(base.getDate()).padStart(2, '0')
                        setForm(f => ({ ...f, recurrence: 'yearly', recurrence_end_date: `${y}-${mm}-${dd}` }))
                      } else {
                        field('recurrence', r.value)
                      }
                    }}
                    className={`py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                      form.recurrence === r.value
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'border-gray-200 dark:border-od-600 text-gray-400 dark:text-od-400 hover:border-gray-300 hover:text-gray-600 bg-white dark:bg-od-700'
                    }`}>
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Day-of-week picker for weekly */}
              {form.recurrence === 'weekly' && (
                <div className="mt-3">
                  <div className="flex gap-1.5">
                    {WEEKDAYS.map((label, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleDay(idx)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-all ${
                          form.recurrence_days.includes(idx)
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-200 dark:border-od-600 text-gray-400 dark:text-od-400 hover:border-gray-300 hover:text-gray-600 bg-white dark:bg-od-700'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {form.recurrence !== 'none' && form.recurrence !== 'yearly' && (
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-gray-400 dark:text-od-400 mb-1.5 uppercase tracking-wide">End date</label>
                  <DatePicker value={form.recurrence_end_date} min={form.date}
                    onChange={d => field('recurrence_end_date', d)} className={inputCls} />
                </div>
              )}
            </div>
          )}

          {mutation.isError && (
            <p className="text-red-600 dark:text-red-400 text-xs bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl px-3.5 py-2.5">
              Failed to save. Please try again.
            </p>
          )}
        </div>

        {/* Scope picker for recurring task edits */}
        {task?.series_id && (
          <div className="px-6 py-3 border-t border-gray-100 dark:border-od-600 bg-gray-50/30 dark:bg-od-700/30">
            <p className="text-[11px] font-semibold text-gray-400 dark:text-od-400 uppercase tracking-wide mb-2">Edit recurring event</p>
            <div className="space-y-1.5">
              {(['instance', 'future', 'all'] as DeleteScope[]).map(s => (
                <label key={s} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="radio" name="editScope" value={s} checked={editScope === s}
                    onChange={() => setEditScope(s)} className="text-blue-600" />
                  <span className="text-sm text-gray-700 dark:text-od-200">
                    {s === 'instance' && 'This event only'}
                    {s === 'future' && 'This and all following events'}
                    {s === 'all' && 'All events in the series'}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-od-600 bg-gray-50/50 dark:bg-od-700/50">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-od-400 hover:text-gray-800 dark:hover:text-od-100 transition-colors rounded-xl hover:bg-gray-100 dark:hover:bg-od-700">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.title.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-colors shadow-sm"
          >
            {mutation.isPending ? 'Saving…' : task ? 'Save changes' : form.is_reminder ? 'Create reminder' : 'Create task'}
          </button>
        </div>
      </div>
    </>
  )
}
