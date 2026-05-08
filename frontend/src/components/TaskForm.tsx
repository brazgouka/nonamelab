import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createTask, updateTask } from '../api/tasks'
import { fetchTaskTypes } from '../api/taskTypes'
import type { Task } from '../types'

interface Props {
  date: string
  task?: Task
  onClose: () => void
  onSaved: () => void
}

type Priority = 'low' | 'medium' | 'high'
type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly'

interface FormState {
  title: string
  description: string
  date: string
  time: string
  priority: Priority | null
  task_type: number | null
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
]

// 0 = Monday … 6 = Sunday (Python weekday() convention)
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const defaultEndDate = () => `${new Date().getFullYear()}-12-31`

const inputCls = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors placeholder:text-gray-400 bg-white'

export default function TaskForm({ date, task, onClose, onSaved }: Props) {
  const { data: taskTypes = [] } = useQuery({ queryKey: ['task-types'], queryFn: fetchTaskTypes })

  const [form, setForm] = useState<FormState>({
    title: task?.title ?? '',
    description: task?.description ?? '',
    date: task?.date ?? date,
    time: task?.time ?? '',
    priority: task?.priority ?? null,
    task_type: task?.task_type ?? null,
    recurrence: task?.recurrence ?? 'none',
    recurrence_days: task?.recurrence_days ?? [],
    recurrence_end_date: task?.recurrence_end_date ?? defaultEndDate(),
  })

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        time: form.time || null,
        recurrence_days: form.recurrence === 'weekly' && form.recurrence_days.length > 0
          ? form.recurrence_days
          : null,
        recurrence_end_date: form.recurrence_end_date || null,
      }
      return task ? updateTask(task.id, payload) : createTask(payload)
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
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-[70] flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">{task ? 'Edit task' : 'New task'}</h3>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors text-xl leading-none">
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
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Date</label>
              <input type="date" value={form.date} onChange={e => field('date', e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Time</label>
              <input type="time" value={form.time} onChange={e => field('time', e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Priority — optional */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Priority</label>
            <div className="grid grid-cols-4 gap-2">
              <button type="button" onClick={() => field('priority', null)}
                className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                  form.priority === null
                    ? 'bg-gray-100 border-gray-300 text-gray-600'
                    : 'border-gray-200 text-gray-300 hover:border-gray-300 hover:text-gray-500 bg-white'
                }`}>
                None
              </button>
              {PRIORITY_OPTS.map(p => (
                <button key={p.value} type="button" onClick={() => field('priority', p.value)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all flex items-center justify-center gap-1.5 ${
                    form.priority === p.value ? p.on : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 bg-white'
                  }`}>
                  <span className={`w-2 h-2 rounded-full ${form.priority === p.value ? p.dot : 'bg-gray-200'}`} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          {taskTypes.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Type</label>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => field('task_type', null)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                    !form.task_type
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 bg-white'
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
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Repeat</label>
              <div className="grid grid-cols-4 gap-1.5">
                {RECURRENCE_OPTS.map(r => (
                  <button key={r.value} type="button" onClick={() => field('recurrence', r.value)}
                    className={`py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                      form.recurrence === r.value
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 bg-white'
                    }`}>
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Day-of-week picker for weekly */}
              {form.recurrence === 'weekly' && (
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                    Days <span className="normal-case font-normal text-gray-300">(empty = same weekday as start)</span>
                  </label>
                  <div className="flex gap-1.5">
                    {WEEKDAYS.map((label, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleDay(idx)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-all ${
                          form.recurrence_days.includes(idx)
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 bg-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {form.recurrence !== 'none' && (
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">End date</label>
                  <input type="date" value={form.recurrence_end_date} min={form.date}
                    onChange={e => field('recurrence_end_date', e.target.value)} className={inputCls} />
                </div>
              )}
            </div>
          )}

          {mutation.isError && (
            <p className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
              Failed to save. Please try again.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors rounded-xl hover:bg-gray-100">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.title.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-colors shadow-sm"
          >
            {mutation.isPending ? 'Saving…' : task ? 'Save changes' : 'Create task'}
          </button>
        </div>
      </div>
    </>
  )
}
