import { useEffect, useState } from 'react'
import { useUi } from '../ui'
import { IconClose, IconTimer } from './Icons'

function clock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Les minuteurs lancés depuis les étapes : visibles par-dessus tous les écrans. */
export function TimerDock() {
  const { timers, stopTimer, addToTimer } = useUi()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!timers.length) return
    const iv = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(iv)
  }, [timers.length])

  if (!timers.length) return null
  return (
    <div className="timer-dock" role="region" aria-label="Minuteurs">
      {timers.map((t) => (
        <div key={t.id} className={`timer${t.done ? ' done' : ''}`}>
          <IconTimer />
          <div className="timer-text">
            <strong aria-live={t.done ? 'assertive' : 'off'}>{t.done ? 'Terminé !' : clock(t.end - now)}</strong>
            <span>{t.label}</span>
          </div>
          {!t.done ? (
            <button type="button" className="btn ghost small" onClick={() => addToTimer(t.id, 60)}>
              +1 min
            </button>
          ) : null}
          <button
            type="button"
            className="icon-btn"
            onClick={() => stopTimer(t.id)}
            aria-label={t.done ? 'Fermer le minuteur' : 'Arrêter le minuteur'}
          >
            <IconClose />
          </button>
        </div>
      ))}
    </div>
  )
}
