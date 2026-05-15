import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchTasks } from '../api/tasks'
import { fetchTaskTypes } from '../api/taskTypes'

const PIXEL_COLS = 52
const PIXEL_ROWS = 32
const SQUARE = 22
const GAP = 2
const PIXEL_TOTAL = PIXEL_COLS * PIXEL_ROWS  // 1664

// Sunset over the ocean: vivid purple sky → warm horizon → dark water with golden reflection
const PIXEL_ART: string[] = (() => {
  const ASPECT = PIXEL_COLS / PIXEL_ROWS  // ~1.625 — keeps circles round
  const HORIZON = 0.60                    // ny where ocean begins
  const SUN_X = 0.50

  function clamp(v: number, lo = 0, hi = 255): number { return Math.max(lo, Math.min(hi, Math.round(v))) }
  function hex(r: number, g: number, b: number): string {
    return `#${clamp(r).toString(16).padStart(2,'0')}${clamp(g).toString(16).padStart(2,'0')}${clamp(b).toString(16).padStart(2,'0')}`
  }
  function fhash(x: number, y: number): number {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
    return Math.abs(s - Math.floor(s))
  }
  function lerp(a: number, b: number, t: number): number { return a + (b - a) * Math.max(0, Math.min(1, t)) }
  function lerpHex(c0: string, c1: string, t: number): string {
    const [r0,g0,b0] = [parseInt(c0.slice(1,3),16), parseInt(c0.slice(3,5),16), parseInt(c0.slice(5,7),16)]
    const [r1,g1,b1] = [parseInt(c1.slice(1,3),16), parseInt(c1.slice(3,5),16), parseInt(c1.slice(5,7),16)]
    return hex(lerp(r0,r1,t), lerp(g0,g1,t), lerp(b0,b1,t))
  }

  // Sky gradient (skyT = ny/HORIZON, 0=top → 1=horizon)
  const SKY: [number, string][] = [
    [0.00, '#1e0838'],  // deep vivid purple
    [0.14, '#3c1268'],  // violet
    [0.30, '#6c1a90'],  // purple-magenta
    [0.46, '#a82870'],  // magenta-pink
    [0.62, '#d84058'],  // pink-red
    [0.76, '#f07028'],  // orange
    [0.88, '#f5a020'],  // golden orange
    [1.00, '#ffc030'],  // bright gold at horizon
  ]
  function skyColor(t: number): string {
    for (let i = 0; i < SKY.length - 1; i++) {
      if (t <= SKY[i + 1][0]) return lerpHex(SKY[i][1], SKY[i+1][1], (t - SKY[i][0]) / (SKY[i+1][0] - SKY[i][0]))
    }
    return SKY[SKY.length - 1][1]
  }

  return Array.from({ length: PIXEL_ROWS * PIXEL_COLS }, (_, idx) => {
    const row = Math.floor(idx / PIXEL_COLS)
    const col = idx % PIXEL_COLS
    const nx = col / (PIXEL_COLS - 1)
    const ny = row / (PIXEL_ROWS - 1)

    // ── OCEAN ────────────────────────────────────────────────────────────────
    if (ny > HORIZON) {
      const depth = (ny - HORIZON) / (1 - HORIZON)

      // Sun reflection pillar (widens toward viewer)
      const rw = 0.030 + depth * 0.24
      const ri = Math.max(0, 1 - Math.abs(nx - SUN_X) / rw) * Math.pow(1 - depth, 0.65)
      const sparkle = (fhash(col * 5, row * 7) > 0.88 && ri > 0.04) ? 0.22 : 0
      const r = Math.min(1, ri + sparkle)

      if (r > 0.70) return '#ffc840'
      if (r > 0.50) return '#f09030'
      if (r > 0.30) return '#c06030'
      if (r > 0.12) return '#7a3828'

      // Dark water with subtle waves
      const wv = 0.011 * Math.sin(nx * Math.PI * 7 + depth * 22)
      const d = depth + wv
      if (d < 0.12) return '#1c4470'
      if (d < 0.26) return '#133258'
      if (d < 0.44) return '#0c2040'
      if (d < 0.64) return '#080f26'
      if (d < 0.82) return '#050818'
      return '#030510'
    }

    // ── SKY ──────────────────────────────────────────────────────────────────
    const skyT = ny / HORIZON  // 0=top, 1=horizon

    // Moon — upper-left, first appears ~day 150
    const moonDist = Math.sqrt(((nx - 0.14) * ASPECT) ** 2 + (ny - 0.155) ** 2)
    if (moonDist < 0.052) return '#fff9e8'
    if (moonDist < 0.075) return '#f0e4c0'

    // Sun — large glow centered at horizon
    const sunDist = Math.sqrt(((nx - SUN_X) * ASPECT) ** 2 + (ny - HORIZON) ** 2)
    if (sunDist < 0.036) return '#fffff2'
    if (sunDist < 0.062) return '#fff8a0'
    if (sunDist < 0.096) return '#ffd030'
    if (sunDist < 0.138) return '#ff9020'
    if (sunDist < 0.185) return '#f06020'
    if (sunDist < 0.238) return '#c84030'
    if (sunDist < 0.295) return '#9a2838'

    // Clouds — three blobs in the warm lower sky (revealed ~day 600-900)
    const clouds = [
      { x: 0.20, t: 0.68, rx: 0.15, ry: 0.055 },
      { x: 0.74, t: 0.72, rx: 0.17, ry: 0.050 },
      { x: 0.44, t: 0.81, rx: 0.12, ry: 0.042 },
    ]
    for (const cl of clouds) {
      const cd = Math.sqrt(((nx - cl.x) / cl.rx) ** 2 + ((skyT - cl.t) / cl.ry) ** 2)
      if (cd < 0.55) return lerpHex(skyColor(cl.t), '#ffb880', 0.55)
      if (cd < 0.80) return lerpHex(skyColor(cl.t), '#ffb880', 0.28)
      if (cd < 1.00) return lerpHex(skyColor(cl.t), '#ffb880', 0.10)
    }

    // Stars — brighter in deep sky, fade toward colorful horizon
    const h = fhash(col, row)
    if (skyT < 0.22 && h > 0.966) return '#ffffff'
    if (skyT < 0.38 && h > 0.975) return '#f8f0ff'
    if (skyT < 0.18 && h > 0.950) return '#d0d8ff'  // faint blue-white stars

    return skyColor(skyT)
  })
})()

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function HabitsPage() {
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null)
  const autoSelected = useRef(false)

  const { data: taskTypes = [] } = useQuery({ queryKey: ['task-types'], queryFn: fetchTaskTypes })

  useEffect(() => {
    if (!autoSelected.current && taskTypes.length > 0) {
      autoSelected.current = true
      setSelectedTypeId(taskTypes[0].id)
    }
  }, [taskTypes])

  const today = useMemo(() => new Date(), [])
  const endDate   = toDateStr(today)
  const startDate = toDateStr(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()))

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', startDate, endDate],
    queryFn: () => fetchTasks(startDate, endDate),
  })

  const streak = useMemo(() => {
    const todayStr = toDateStr(today)

    const completedDates = new Set<string>()
    const scheduledDates = new Set<string>()

    for (const t of tasks) {
      if (t.is_reminder) continue
      if (selectedTypeId != null && t.task_type !== selectedTypeId) continue
      scheduledDates.add(t.date)
      if (t.completed) completedDates.add(t.date)
    }

    let count = 0
    const d = new Date(today)

    for (let i = 0; i < 1700; i++) {
      const ds = toDateStr(d)
      if (scheduledDates.has(ds)) {
        if (completedDates.has(ds)) {
          count++
        } else if (ds !== todayStr) {
          break
        }
      }
      d.setDate(d.getDate() - 1)
    }

    return count
  }, [tasks, selectedTypeId, today])

  const revealed = Math.min(streak, PIXEL_TOTAL)
  const pct = Math.round((revealed / PIXEL_TOTAL) * 100)

  return (
    <div className="h-full flex flex-col bg-white dark:bg-od-800">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-od-600 flex-shrink-0 flex-wrap">
        {taskTypes.map(tt => (
          <button
            key={tt.id}
            onClick={() => setSelectedTypeId(selectedTypeId === tt.id ? null : tt.id)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all"
            style={
              selectedTypeId === tt.id
                ? { backgroundColor: tt.color, borderColor: tt.color, color: '#fff' }
                : { borderColor: tt.color + '60', color: tt.color, backgroundColor: tt.color + '12' }
            }
          >
            {tt.name}
          </button>
        ))}

        <div className="flex-1" />

        <div className="text-right leading-tight">
          <div>
            <span className="text-3xl font-bold text-gray-900 dark:text-od-100 tabular-nums">{streak}</span>
            <span className="text-sm text-gray-400 dark:text-od-400 ml-1.5">day streak</span>
          </div>
          <div className="text-xs text-gray-300 dark:text-od-500 mt-0.5">
            {revealed} / {PIXEL_TOTAL} squares revealed
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto flex items-start justify-center p-6">
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${PIXEL_COLS}, ${SQUARE}px)`,
              gap: `${GAP}px`,
            }}
          >
            {PIXEL_ART.map((color, i) => (
              <div
                key={i}
                style={{
                  width: SQUARE,
                  height: SQUARE,
                  backgroundColor: i < revealed ? color : undefined,
                  borderRadius: 2,
                }}
                className={i < revealed ? '' : 'bg-gray-100 dark:bg-od-700'}
              />
            ))}
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex-1 bg-gray-100 dark:bg-od-700 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-orange-400 h-1.5 rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 dark:text-od-400 tabular-nums flex-shrink-0 w-8 text-right">
              {pct}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
