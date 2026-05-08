import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchPeriodNote, savePeriodNote,
  fetchPeriodTodos, createPeriodTodo, togglePeriodTodo, deletePeriodTodo,
} from '../api/periodNotes'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface Props {
  year: number
  month: number | null  // null = year-level
  onClose: () => void
}

type Tab = 'todos' | 'notes'
type Scope = 'month' | 'year'

export default function PeriodPanel({ year, month: initialMonth, onClose }: Props) {
  const [scope, setScope] = useState<Scope>(initialMonth != null ? 'month' : 'year')
  const activeMonth = scope === 'month' ? initialMonth : null
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('todos')
  const [noteText, setNoteText] = useState('')
  const [noteDirty, setNoteDirty] = useState(false)
  const [newTodo, setNewTodo] = useState('')
  const todoInputRef = useRef<HTMLInputElement>(null)

  const noteKey = ['period-note', year, activeMonth]
  const todoKey = ['period-todos', year, activeMonth]

  const { data: note } = useQuery({
    queryKey: noteKey,
    queryFn: () => fetchPeriodNote(year, activeMonth),
  })

  useEffect(() => {
    if (note) {
      setNoteText(note.content)
      setNoteDirty(false)
    }
  }, [note])

  const { data: todos = [] } = useQuery({
    queryKey: todoKey,
    queryFn: () => fetchPeriodTodos(year, activeMonth),
  })

  const saveNote = useMutation({
    mutationFn: () => savePeriodNote(year, activeMonth, noteText),
    onSuccess: saved => { qc.setQueryData(noteKey, saved); setNoteDirty(false) },
  })

  const addTodo = useMutation({
    mutationFn: (title: string) => createPeriodTodo(year, activeMonth, title),
    onSuccess: () => { qc.invalidateQueries({ queryKey: todoKey }); setNewTodo('') },
  })

  const toggleTodo = useMutation({
    mutationFn: (id: number) => togglePeriodTodo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: todoKey }),
  })

  const removeTodo = useMutation({
    mutationFn: (id: number) => deletePeriodTodo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: todoKey }),
  })

  const title = scope === 'month' && initialMonth != null
    ? `${MONTHS[initialMonth - 1]} ${year}`
    : String(year)

  const open = todos.filter(t => !t.completed)
  const done = todos.filter(t => t.completed)

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{title}</h2>
              {initialMonth != null && (
                <div className="flex items-center gap-1 mt-2">
                  {(['month', 'year'] as Scope[]).map(s => (
                    <button key={s} onClick={() => setScope(s)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                        scope === s
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors text-xl leading-none mt-0.5">
              ×
            </button>
          </div>

          <div className="flex gap-1 mt-4">
            {(['todos', 'notes'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                  tab === t
                    ? 'bg-gray-900 border-gray-900 text-white'
                    : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 bg-white'
                }`}>
                {t === 'todos' ? 'To-do' : 'Notes'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'notes' ? (
            <div className="flex flex-col h-full gap-3">
              <textarea
                className="flex-1 w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors placeholder:text-gray-400 resize-none min-h-[200px]"
                placeholder={`Notes for ${title}…`}
                value={noteText}
                onChange={e => { setNoteText(e.target.value); setNoteDirty(true) }}
              />
              <button
                onClick={() => saveNote.mutate()}
                disabled={!noteDirty || saveNote.isPending}
                className="self-end px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors shadow-sm"
              >
                {saveNote.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <form
                onSubmit={e => { e.preventDefault(); const t = newTodo.trim(); if (t) addTodo.mutate(t) }}
                className="flex gap-2 mb-4"
              >
                <input
                  ref={todoInputRef}
                  value={newTodo}
                  onChange={e => setNewTodo(e.target.value)}
                  placeholder="Add item…"
                  className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors placeholder:text-gray-400"
                />
                <button type="submit" disabled={!newTodo.trim() || addTodo.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors">
                  Add
                </button>
              </form>

              {todos.length === 0 && (
                <p className="text-sm text-gray-300 text-center py-8">No items yet</p>
              )}

              {open.map(todo => (
                <div key={todo.id} className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <button onClick={() => toggleTodo.mutate(todo.id)}
                    className="w-[18px] h-[18px] rounded-[5px] border-2 flex-shrink-0 flex items-center justify-center border-gray-300 hover:border-blue-400 bg-white transition-all" />
                  <span className="flex-1 text-sm text-gray-800">{todo.title}</span>
                  <button onClick={() => removeTodo.mutate(todo.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 w-6 h-6 flex items-center justify-center rounded-lg text-base transition-all">×</button>
                </div>
              ))}

              {done.length > 0 && (
                <>
                  <p className="text-[11px] font-semibold text-gray-300 uppercase tracking-widest pt-4 pb-1 pl-1">Done</p>
                  {done.map(todo => (
                    <div key={todo.id} className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors opacity-50">
                      <button onClick={() => toggleTodo.mutate(todo.id)}
                        className="w-[18px] h-[18px] rounded-[5px] border-2 flex-shrink-0 flex items-center justify-center text-[10px] font-bold border-blue-500 bg-blue-500 text-white transition-all">✓</button>
                      <span className="flex-1 text-sm text-gray-400 line-through">{todo.title}</span>
                      <button onClick={() => removeTodo.mutate(todo.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 w-6 h-6 flex items-center justify-center rounded-lg text-base transition-all">×</button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
