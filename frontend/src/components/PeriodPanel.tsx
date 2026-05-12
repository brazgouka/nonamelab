import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchPeriodNote, savePeriodNote,
  fetchPeriodTodos, createPeriodTodo, togglePeriodTodo, deletePeriodTodo, reorderPeriodTodos,
} from '../api/periodNotes'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

interface Props {
  year: number
  month: number | null
  onClose: () => void
}

type Scope = 'month' | 'year'

export default function PeriodPanel({ year, month: initialMonth, onClose }: Props) {
  const [scope, setScope] = useState<Scope>(initialMonth != null ? 'month' : 'year')
  const activeMonth = scope === 'month' ? initialMonth : null
  const qc = useQueryClient()

  const [noteText, setNoteText] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [newTodo, setNewTodo] = useState('')
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dropIdx, setDropIdx] = useState<number | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const noteKey = ['period-note', year, activeMonth]
  const todoKey = ['period-todos', year, activeMonth]

  const { data: note } = useQuery({
    queryKey: noteKey,
    queryFn: () => fetchPeriodNote(year, activeMonth),
  })

  useEffect(() => {
    if (note !== undefined) { setNoteText(note.content); setSaveStatus('idle') }
  }, [note?.id, activeMonth])

  const { data: todos = [] } = useQuery({
    queryKey: todoKey,
    queryFn: () => fetchPeriodTodos(year, activeMonth),
  })

  const saveNote = useMutation({
    mutationFn: () => savePeriodNote(year, activeMonth, noteText),
    onMutate: () => setSaveStatus('saving'),
    onSuccess: saved => { qc.setQueryData(noteKey, saved); setSaveStatus('saved') },
  })

  function handleNoteChange(val: string) {
    setNoteText(val)
    setSaveStatus('idle')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => saveNote.mutate(), 1000)
  }

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

  const periodLabel = scope === 'month' && initialMonth != null
    ? `${MONTHS[initialMonth - 1]} ${year}` : String(year)

  const open = todos.filter(t => !t.completed)
  const done = todos.filter(t => t.completed)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-gray-900">{periodLabel}</h2>
            {initialMonth != null && (
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                {(['month', 'year'] as Scope[]).map(s => (
                  <button key={s} onClick={() => setScope(s)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all ${
                      scope === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors text-xl leading-none">
            ×
          </button>
        </div>

        {/* Two-column body */}
        <div className="flex flex-1 overflow-hidden divide-x divide-gray-100">
          {/* Left — To-do */}
          <div className="flex flex-col w-1/2 overflow-y-auto px-5 py-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">To-do</p>

            <form onSubmit={e => { e.preventDefault(); const t = newTodo.trim(); if (t) addTodo.mutate(t) }}
              className="flex gap-2 mb-3 flex-shrink-0">
              <input
                value={newTodo}
                onChange={e => setNewTodo(e.target.value)}
                placeholder="Add item…"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors placeholder:text-gray-400"
              />
              <button type="submit" disabled={!newTodo.trim() || addTodo.isPending}
                className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors flex-shrink-0">
                Add
              </button>
            </form>

            {todos.length === 0 && (
              <p className="text-sm text-gray-300 py-4 pl-1">No items yet</p>
            )}

            <div className="space-y-0.5">
              {open.map((todo, i) => (
                <div
                  key={todo.id}
                  draggable
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={e => { e.preventDefault(); setDropIdx(i) }}
                  onDrop={() => {
                    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setDropIdx(null); return }
                    const reordered = [...open]
                    const [moved] = reordered.splice(dragIdx, 1)
                    reordered.splice(i, 0, moved)
                    const ids = [...reordered.map(t => t.id), ...done.map(t => t.id)]
                    qc.setQueryData(todoKey, [...reordered, ...done])
                    reorderPeriodTodos(ids)
                    setDragIdx(null); setDropIdx(null)
                  }}
                  onDragEnd={() => { setDragIdx(null); setDropIdx(null) }}
                  className={`group flex items-center gap-2.5 px-2 py-2.5 rounded-xl transition-colors ${
                    dropIdx === i ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-3 h-3 text-gray-300 cursor-grab flex-shrink-0 opacity-0 group-hover:opacity-100" viewBox="0 0 10 16" fill="currentColor">
                    <circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/>
                    <circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
                    <circle cx="2" cy="14" r="1.5"/><circle cx="8" cy="14" r="1.5"/>
                  </svg>
                  <button onClick={() => toggleTodo.mutate(todo.id)}
                    className="w-[18px] h-[18px] rounded-[5px] border-2 flex-shrink-0 border-gray-300 hover:border-blue-400 bg-white transition-all" />
                  <span className="flex-1 text-sm text-gray-800">{todo.title}</span>
                  <button onClick={() => removeTodo.mutate(todo.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 w-6 h-6 flex items-center justify-center rounded-lg text-base transition-all">×</button>
                </div>
              ))}
              {done.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-widest pt-3 pb-1 pl-2">Done</p>
                  {done.map(todo => (
                    <div key={todo.id} className="group flex items-center gap-2.5 px-2 py-2.5 rounded-xl hover:bg-gray-50 transition-colors opacity-40">
                      <button onClick={() => toggleTodo.mutate(todo.id)}
                        className="w-[18px] h-[18px] rounded-[5px] border-2 flex-shrink-0 border-blue-500 bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">✓</button>
                      <span className="flex-1 text-sm text-gray-400 line-through">{todo.title}</span>
                      <button onClick={() => removeTodo.mutate(todo.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 w-6 h-6 flex items-center justify-center rounded-lg text-base transition-all">×</button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Right — Notes */}
          <div className="flex flex-col w-1/2 px-5 py-4">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Notes</p>
              <span className={`text-[11px] transition-opacity duration-300 ${
                saveStatus === 'saving' ? 'text-gray-400 opacity-100'
                : saveStatus === 'saved' ? 'text-emerald-500 opacity-100'
                : 'opacity-0'
              }`}>
                {saveStatus === 'saving' ? 'Saving…' : '✓ Saved'}
              </span>
            </div>
            <textarea
              className="flex-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors placeholder:text-gray-400 resize-none"
              placeholder={`Notes for ${periodLabel}…`}
              value={noteText}
              onChange={e => handleNoteChange(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
