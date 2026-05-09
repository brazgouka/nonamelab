import type { Task } from '../types'

interface Props {
  task: Task
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}

const PRIORITY: Record<string, { dot: string }> = {
  low:    { dot: 'bg-emerald-400' },
  medium: { dot: 'bg-amber-400' },
  high:   { dot: 'bg-red-500' },
}

export default function TaskCard({ task, onToggle, onEdit, onDelete }: Props) {
  const typeColor = task.task_type_detail?.color ?? '#6366f1'

  return (
    <div
      className={`group relative flex items-start gap-3 p-3 rounded-xl border transition-all ${
        task.completed
          ? 'bg-gray-50 dark:bg-od-700/50 border-gray-100 dark:border-od-600/50 opacity-55'
          : 'bg-white dark:bg-od-700 border-gray-200 dark:border-od-600 hover:border-gray-300 dark:hover:border-od-600 hover:shadow-sm cursor-pointer'
      }`}
      style={!task.completed ? { borderLeftColor: typeColor, borderLeftWidth: '3px' } : {}}
    >
      {/* Checkbox */}
      <button
        onClick={e => { e.stopPropagation(); onToggle() }}
        className={`mt-0.5 w-[18px] h-[18px] rounded-[5px] border-2 flex-shrink-0 flex items-center justify-center text-[10px] font-bold transition-all ${
          task.completed
            ? 'border-blue-500 bg-blue-500 text-white'
            : 'border-gray-300 dark:border-od-600 hover:border-blue-400 bg-white dark:bg-od-700'
        }`}
      >
        {task.completed && '✓'}
      </button>

      {/* Body */}
      <div className="flex-1 min-w-0" onClick={onEdit}>
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-medium leading-snug ${
            task.completed ? 'line-through text-gray-400 dark:text-od-400' : 'text-gray-900 dark:text-od-100'
          }`}>
            {task.title}
          </span>
          {task.priority && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY[task.priority].dot}`} />}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.time && <span className="text-xs text-gray-400 dark:text-od-400">{task.time.slice(0, 5)}</span>}
          {task.task_type_detail && (
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: typeColor + '18', color: typeColor }}>
              {task.task_type_detail.name}
            </span>
          )}
          {task.description && (
            <span className="text-xs text-gray-400 dark:text-od-400 truncate max-w-[16rem]">{task.description}</span>
          )}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        className="opacity-0 group-hover:opacity-100 text-gray-300 dark:text-od-500 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-lg leading-none"
        aria-label="Delete"
      >
        ×
      </button>
    </div>
  )
}
