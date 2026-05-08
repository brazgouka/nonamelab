import { useState } from 'react'
import type { Task, DeleteScope } from '../types'

interface Props {
  task: Task
  onClose: () => void
  onConfirm: (scope: DeleteScope) => void
  isLoading: boolean
}

export default function DeleteModal({ task, onClose, onConfirm, isLoading }: Props) {
  const [scope, setScope] = useState<DeleteScope>('instance')

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[80]" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-xl shadow-2xl z-[90] p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Delete task</h3>
        <p className="text-sm text-gray-500 mb-4">
          Delete <span className="font-medium text-gray-700">"{task.title}"</span>?
        </p>
        {task.series_id && (
          <div className="space-y-2 mb-5 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Recurring task</p>
            {(['instance', 'future', 'all'] as DeleteScope[]).map(s => (
              <label key={s} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  value={s}
                  checked={scope === s}
                  onChange={() => setScope(s)}
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-700">
                  {s === 'instance' && 'This event only'}
                  {s === 'future' && 'This and all following events'}
                  {s === 'all' && 'All events in the series'}
                </span>
              </label>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(scope)}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </>
  )
}
