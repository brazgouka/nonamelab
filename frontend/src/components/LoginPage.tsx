import { useState } from 'react'
import { login } from '../api/auth'

interface Props {
  onLogin: () => void
}

export default function LoginPage({ onLogin }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(password)
      onLogin()
    } catch {
      setError('Incorrect password')
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-od-900">
      <div className="w-full max-w-sm px-8 py-10 bg-white dark:bg-od-800 rounded-2xl shadow-xl border border-gray-100 dark:border-od-600">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-od-100">Homelab</h1>
          <p className="text-sm text-gray-400 dark:text-od-400 mt-1">Enter your password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            required
            className="w-full border border-gray-200 dark:border-od-600 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-od-100 bg-white dark:bg-od-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder:text-gray-400 dark:placeholder:text-od-500 transition-colors"
          />
          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors shadow-sm"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
