import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTaskTypes, createTaskType, updateTaskType, deleteTaskType } from '../api/taskTypes'
import type { TaskType } from '../types'

interface Props {
  onClose: () => void
}

const PRESETS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
  '#14b8a6', '#6366f1', '#84cc16', '#6b7280',
]

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map(c => (
          <button key={c} type="button" onClick={() => onChange(c)}
            className={`w-7 h-7 rounded-lg transition-all ${value === c ? 'ring-2 ring-offset-1 ring-gray-500 scale-110' : 'hover:scale-110'}`}
            style={{ backgroundColor: c }} />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
        <span className="text-xs text-gray-400 font-mono">{value}</span>
      </div>
    </div>
  )
}

function TypeRow({ type, onRefresh }: { type: TaskType; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(type.name)
  const [color, setColor] = useState(type.color)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const updateMutation = useMutation({
    mutationFn: () => updateTaskType(type.id, { name, color }),
    onSuccess: () => { setEditing(false); onRefresh() },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteTaskType(type.id),
    onSuccess: onRefresh,
  })

  if (editing) {
    return (
      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
        <input value={name} onChange={e => setName(e.target.value)} autoFocus
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
        <ColorPicker value={color} onChange={setColor} />
        <div className="flex gap-2 justify-end">
          <button onClick={() => { setEditing(false); setName(type.name); setColor(type.color) }}
            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium">
            Cancel
          </button>
          <button onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending || !name.trim()}
            className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
            {updateMutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-gray-50 group transition-colors">
      <div className="w-4 h-4 rounded-md flex-shrink-0" style={{ backgroundColor: type.color }} />
      <span className="flex-1 text-sm font-medium text-gray-800">{type.name}</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setEditing(true)}
          className="px-2 py-1 text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
          Edit
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-red-500">Unset from tasks?</span>
            <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}
              className="px-2 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50">
              Yes
            </button>
            <button onClick={() => setConfirmDelete(false)}
              className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 rounded-lg">
              No
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)}
            className="px-2 py-1 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

export default function TaskTypeManager({ onClose }: Props) {
  const qc = useQueryClient()
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESETS[0])
  const [showAdd, setShowAdd] = useState(false)

  const { data: taskTypes = [] } = useQuery({ queryKey: ['task-types'], queryFn: fetchTaskTypes })

  const createMutation = useMutation({
    mutationFn: () => createTaskType({ name: newName.trim(), color: newColor }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-types'] })
      setNewName(''); setNewColor(PRESETS[0]); setShowAdd(false)
    },
  })

  function refresh() {
    qc.invalidateQueries({ queryKey: ['task-types'] })
    qc.invalidateQueries({ queryKey: ['tasks'] })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80]" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-[90] overflow-hidden max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Task Types</h3>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {taskTypes.length === 0 && !showAdd ? (
            <p className="text-sm text-gray-400 text-center py-8">No types yet.</p>
          ) : (
            <div className="space-y-0.5">
              {taskTypes.map(tt => <TypeRow key={tt.id} type={tt} onRefresh={refresh} />)}
            </div>
          )}
        </div>

        <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50/50">
          {showAdd ? (
            <div className="space-y-3">
              <input
                placeholder="Type name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) createMutation.mutate() }}
              />
              <ColorPicker value={newColor} onChange={setNewColor} />
              <div className="flex items-center gap-2 justify-end">
                <button onClick={() => setShowAdd(false)}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium">
                  Cancel
                </button>
                <button onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !newName.trim()}
                  className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
                  {createMutation.isPending ? 'Adding…' : 'Add type'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm font-medium text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors">
              <span className="text-lg leading-none">+</span> Add type
            </button>
          )}
        </div>
      </div>
    </>
  )
}
