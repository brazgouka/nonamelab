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

  const { data: taskTypes = [] } = useQuery({
    queryKey: ['task-types'],
    queryFn: fetchTaskTypes,
  })

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-200 px-6 py-0 flex items-stretch justify-between">
        <nav className="flex items-stretch gap-1">
          {([
            { id: 'today' as Page, label: 'Today' },
            { id: 'calendar' as Page, label: 'Calendar' },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setPage(tab.id)}
              className={`px-4 py-4 text-sm font-semibold border-b-2 transition-colors ${
                page === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <button
          onClick={() => setShowTypeManager(true)}
          className="flex items-center gap-1.5 px-3 py-2 my-2 text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Types
        </button>
      </header>

      {page === 'today' ? (
        <TodayPage />
      ) : (
        <main className="max-w-7xl mx-auto px-6 py-6">
          {taskTypes.length > 0 && (
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1">Filter</span>
              <button
                onClick={() => setFilterTypeId(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                  !filterTypeId
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400 hover:text-gray-600'
                }`}
              >
                All
              </button>
              {taskTypes.map(tt => (
                <button
                  key={tt.id}
                  onClick={() => setFilterTypeId(filterTypeId === tt.id ? null : tt.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all"
                  style={
                    filterTypeId === tt.id
                      ? { backgroundColor: tt.color, borderColor: tt.color, color: '#fff' }
                      : { borderColor: tt.color + '60', color: tt.color, backgroundColor: tt.color + '12' }
                  }
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: filterTypeId === tt.id ? '#fff' : tt.color }} />
                  {tt.name}
                </button>
              ))}
            </div>
          )}
          <Calendar onSelectDate={setSelectedDate} filterTypeId={filterTypeId} />
        </main>
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
