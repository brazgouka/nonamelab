import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import Calendar from './components/Calendar'
import DayPanel from './components/DayPanel'
import TaskTypeManager from './components/TaskTypeManager'
import TodayPage from './components/TodayPage'
import HabitsPage from './components/HabitsPage'
import { fetchTaskTypes } from './api/taskTypes'

const queryClient = new QueryClient()

type Page = 'calendar' | 'today' | 'habits'

function AppInner() {
  const [page, setPage] = useState<Page>('today')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showTypeManager, setShowTypeManager] = useState(false)
  const [filterTypeId, setFilterTypeId] = useState<number | null>(null)
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const { data: taskTypes = [] } = useQuery({ queryKey: ['task-types'], queryFn: fetchTaskTypes })

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-od-900 overflow-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-od-800 border-b border-gray-200 dark:border-od-600 px-6 py-0 flex items-stretch justify-between flex-shrink-0">
        <nav className="flex items-stretch gap-1">
          {(['today', 'calendar', 'habits'] as Page[]).map(tab => (
            <button key={tab} onClick={() => setPage(tab)}
              className={`px-4 py-4 text-sm font-semibold border-b-2 capitalize transition-colors ${
                page === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-od-100'
              }`}>
              {tab}
            </button>
          ))}
        </nav>
        <button onClick={() => setIsDark(d => !d)}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-od-100 hover:bg-gray-100 dark:hover:bg-od-700 transition-colors my-2"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {isDark ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
      </header>

      {page === 'today' ? (
        <div className="flex-1 overflow-y-auto">
          <TodayPage />
        </div>
      ) : page === 'habits' ? (
        <div className="flex-1 overflow-hidden">
          <HabitsPage />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Filter sidebar */}
          <aside className="w-44 flex-shrink-0 bg-white dark:bg-od-800 border-r border-gray-200 dark:border-od-600 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-3 py-5">
              <p className="text-[11px] font-semibold text-gray-400 dark:text-od-400 uppercase tracking-widest px-3 mb-2">Filter</p>
              <div className="space-y-0.5">
                <button
                  onClick={() => setFilterTypeId(null)}
                  className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    filterTypeId === null
                      ? 'bg-gray-900 dark:bg-od-100 text-white dark:text-od-900'
                      : 'text-gray-600 dark:text-od-400 hover:bg-gray-100 dark:hover:bg-od-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${filterTypeId === null ? 'bg-white dark:bg-od-800' : 'bg-gray-300 dark:bg-od-600'}`} />
                  All
                </button>
                {taskTypes.map(tt => (
                  <button
                    key={tt.id}
                    onClick={() => setFilterTypeId(filterTypeId === tt.id ? null : tt.id)}
                    className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-od-700 ${filterTypeId !== tt.id ? 'text-gray-500 dark:text-od-400' : ''}`}
                    style={filterTypeId === tt.id ? { backgroundColor: tt.color + '18', color: tt.color } : undefined}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tt.color }} />
                    <span className="truncate">{tt.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="px-3 py-3 border-t border-gray-100 dark:border-od-600 flex-shrink-0">
              <button onClick={() => setShowTypeManager(true)}
                title="Manage task types"
                className="w-full flex items-center justify-center py-2 rounded-xl text-gray-400 dark:text-od-400 hover:text-gray-700 dark:hover:text-od-100 hover:bg-gray-100 dark:hover:bg-od-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </button>
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
