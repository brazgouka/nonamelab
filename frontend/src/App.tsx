import { useState } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import Calendar from './components/Calendar'
import DayPanel from './components/DayPanel'
import TaskTypeManager from './components/TaskTypeManager'
import TodayPage from './components/TodayPage'
import { fetchTaskTypes } from './api/taskTypes'

const queryClient = new QueryClient()

type Page = 'calendar' | 'today'

function AppInner() {
  const [page, setPage] = useState<Page>('today')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showTypeManager, setShowTypeManager] = useState(false)
  const [filterTypeId, setFilterTypeId] = useState<number | null>(null)

  const { data: taskTypes = [] } = useQuery({ queryKey: ['task-types'], queryFn: fetchTaskTypes })

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-0 flex items-stretch justify-between flex-shrink-0">
        <nav className="flex items-stretch gap-1">
          {(['today', 'calendar'] as Page[]).map(tab => (
            <button key={tab} onClick={() => setPage(tab)}
              className={`px-4 py-4 text-sm font-semibold border-b-2 capitalize transition-colors ${
                page === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}>
              {tab}
            </button>
          ))}
        </nav>
        <button onClick={() => setShowTypeManager(true)}
          className="flex items-center gap-1.5 px-3 py-2 my-2 text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Types
        </button>
      </header>

      {page === 'today' ? (
        <div className="flex-1 overflow-y-auto">
          <TodayPage />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Filter sidebar */}
          <aside className="w-48 flex-shrink-0 bg-white border-r border-gray-200 px-3 py-5 overflow-y-auto">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-2">Filter</p>
            <div className="space-y-0.5">
              <button
                onClick={() => setFilterTypeId(null)}
                className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  filterTypeId === null
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${filterTypeId === null ? 'bg-white' : 'bg-gray-300'}`} />
                All
              </button>
              {taskTypes.map(tt => (
                <button
                  key={tt.id}
                  onClick={() => setFilterTypeId(filterTypeId === tt.id ? null : tt.id)}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-gray-50"
                  style={
                    filterTypeId === tt.id
                      ? { backgroundColor: tt.color + '18', color: tt.color }
                      : { color: '#6b7280' }
                  }
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tt.color }} />
                  <span className="truncate">{tt.name}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* Calendar area */}
          <main className="flex-1 overflow-hidden p-6 flex flex-col">
            <Calendar onSelectDate={setSelectedDate} filterTypeId={filterTypeId} />
          </main>
        </div>
      )}

      {selectedDate && <DayPanel date={selectedDate} onClose={() => setSelectedDate(null)} />}
      {showTypeManager && <TaskTypeManager onClose={() => setShowTypeManager(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  )
}
