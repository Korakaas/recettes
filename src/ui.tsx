import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { RecipeDraft } from './types'

/** Les écrans qui s'ouvrent par-dessus la page. Le bouton retour du téléphone les ferme un à un. */
export type Overlay =
  | { t: 'detail'; id: string }
  | { t: 'edit'; id?: string; draft?: Partial<RecipeDraft>; queue?: string[] }
  | { t: 'add' }
  | { t: 'log'; id: string }
  | { t: 'settings' }

export interface TimerItem {
  id: number
  label: string
  end: number
  done: boolean
}

interface Ui {
  stack: Overlay[]
  open(o: Overlay): void
  close(n?: number): void
  replace(o: Overlay): void
  toast(msg: string): void
  toastMsg: string
  timers: TimerItem[]
  startTimer(label: string, seconds: number): void
  addToTimer(id: number, seconds: number): void
  stopTimer(id: number): void
}

const UiContext = createContext<Ui | null>(null)

export function UiProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Overlay[]>([])
  const stackRef = useRef<Overlay[]>([])
  const [toastMsg, setToastMsg] = useState('')
  const toastTimer = useRef<number>(0)
  const [timers, setTimers] = useState<TimerItem[]>([])
  const nextTimer = useRef(1)
  const audio = useRef<AudioContext | null>(null)

  const commit = useCallback((next: Overlay[]) => {
    stackRef.current = next
    setStack(next)
  }, [])

  useEffect(() => {
    history.replaceState({ depth: 0 }, '')
    const onPop = () => {
      const depth = typeof history.state?.depth === 'number' ? (history.state.depth as number) : 0
      commit(stackRef.current.slice(0, depth))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [commit])

  const open = useCallback(
    (o: Overlay) => {
      const next = [...stackRef.current, o]
      history.pushState({ depth: next.length }, '')
      commit(next)
    },
    [commit],
  )

  const close = useCallback((n = 1) => {
    const k = Math.min(n, stackRef.current.length)
    if (k > 0) history.go(-k)
  }, [])

  const replace = useCallback(
    (o: Overlay) => {
      const next = [...stackRef.current.slice(0, -1), o]
      history.replaceState({ depth: next.length }, '')
      commit(next)
    },
    [commit],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stackRef.current.length) history.go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const toast = useCallback((msg: string) => {
    setToastMsg(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastMsg(''), 3600)
  }, [])

  const beep = useCallback(() => {
    try {
      const ctx = audio.current
      if (ctx) {
        for (let i = 0; i < 3; i++) {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.frequency.value = 880
          gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.35)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.35 + 0.25)
          osc.connect(gain).connect(ctx.destination)
          osc.start(ctx.currentTime + i * 0.35)
          osc.stop(ctx.currentTime + i * 0.35 + 0.28)
        }
      }
      navigator.vibrate?.([300, 150, 300, 150, 300])
    } catch {
      /* le son est un plus */
    }
  }, [])

  const startTimer = useCallback((label: string, seconds: number) => {
    try {
      audio.current ??= new AudioContext()
      void audio.current.resume()
    } catch {
      /* ignoré */
    }
    setTimers((t) => [...t, { id: nextTimer.current++, label, end: Date.now() + seconds * 1000, done: false }])
  }, [])

  const addToTimer = useCallback((id: number, seconds: number) => {
    setTimers((t) => t.map((x) => (x.id === id ? { ...x, end: x.end + seconds * 1000, done: false } : x)))
  }, [])

  const stopTimer = useCallback((id: number) => setTimers((t) => t.filter((x) => x.id !== id)), [])

  const hasRunning = timers.some((t) => !t.done)
  useEffect(() => {
    if (!hasRunning) return
    const iv = window.setInterval(() => {
      const now = Date.now()
      let finished = false
      setTimers((list) =>
        list.map((t) => {
          if (!t.done && t.end <= now) {
            finished = true
            return { ...t, done: true }
          }
          return t
        }),
      )
      if (finished) beep()
    }, 500)
    return () => window.clearInterval(iv)
  }, [hasRunning, beep])

  const value = useMemo<Ui>(
    () => ({ stack, open, close, replace, toast, toastMsg, timers, startTimer, addToTimer, stopTimer }),
    [stack, open, close, replace, toast, toastMsg, timers, startTimer, addToTimer, stopTimer],
  )
  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}

export function useUi(): Ui {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error('UiProvider manquant')
  return ctx
}
