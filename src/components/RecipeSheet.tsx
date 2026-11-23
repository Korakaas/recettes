import { useEffect, useMemo, useState } from 'react'
import { BUDGETS, DIFFICULTIES, KINDS, SEASONS, TIMES, labelOf } from '../constants'
import { scaleLine, splitLines, timerFromStep } from '../scale'
import { useStore } from '../store'
import { useUi } from '../ui'
import { ago, formatDay, lastMade } from '../util'
import { Stars } from './Bits'
import { IconTimer } from './Icons'
import { Sheet } from './Sheet'

/** Garde l'écran allumé tant que la fiche est en mode cuisine. */
function useWakeLock(on: boolean): void {
  useEffect(() => {
    if (!on || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
        if (cancelled) void lock.release()
      } catch {
        /* refusé (batterie faible, onglet en arrière-plan) : sans importance */
      }
    }
    void acquire()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [on])
}

export function RecipeSheet({ id }: { id: string }) {
  const { recipes, patch, remove, removeLog } = useStore()
  const ui = useUi()
  const r = recipes.find((x) => x.id === id)
  const [servings, setServings] = useState<number | null>(null)
  const [cook, setCook] = useState(false)
  const [ingDone, setIngDone] = useState<Record<number, boolean>>({})
  const [stepDone, setStepDone] = useState<Record<number, boolean>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  useWakeLock(cook)

  const base = r?.servings ?? 4
  const target = servings ?? base
  const ingredients = useMemo(() => splitLines(r?.ingredients ?? ''), [r?.ingredients])
  const steps = useMemo(
    () => splitLines(r?.steps ?? '').map((s) => s.replace(/^\d+\s*[.)\-]\s*/, '')),
    [r?.steps],
  )

  if (!r) {
    return (
      <Sheet title="Recette introuvable">
        <p className="muted">Cette recette n’existe plus.</p>
      </Sheet>
    )
  }

  const last = lastMade(r)
  const factor = target / base
  const journal = r.journal.map((e, i) => ({ e, i })).reverse()
  const info = [
    labelOf(KINDS, r.kind),
    r.time ? `${labelOf(TIMES, r.time)} (${TIMES.find((t) => t.id === r.time)?.hint})` : '',
    r.cuisine,
    r.budget ? labelOf(BUDGETS, r.budget) : '',
    r.difficulty ? labelOf(DIFFICULTIES, r.difficulty) : '',
  ].filter(Boolean)

  async function doDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      window.setTimeout(() => setConfirmDelete(false), 4000)
      return
    }
    try {
      await remove(id)
      ui.close()
      ui.toast('Recette supprimée.')
    } catch {
      ui.toast('Suppression impossible. Réessaie.')
    }
  }

  return (
    <Sheet
      title={r.name}
      cook={cook}
      actions={
        <button type="button" className="btn ghost small" aria-pressed={cook} onClick={() => setCook((c) => !c)}>
          {cook ? 'Quitter le mode cuisine' : 'Mode cuisine'}
        </button>
      }
      footer={
        <>
          <button type="button" className="btn grow" onClick={() => ui.open({ t: 'log', id })}>
            Je l’ai faite
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => ui.open({ t: 'edit', id })}
          >
            Modifier
          </button>
        </>
      }
    >
      {r.auto ? (
        <div className="notice">
          <p>Claude a proposé ce classement. Relis-le et valide-le, ou corrige-le.</p>
          <div className="notice-actions">
            <button
              type="button"
              className="btn small"
              onClick={() => patch(id, { auto: false }).then(() => ui.toast('Classement validé.'))}
            >
              Valider
            </button>
            <button type="button" className="btn ghost small" onClick={() => ui.open({ t: 'edit', id })}>
              Corriger
            </button>
          </div>
        </div>
      ) : null}

      <div className="detail-head">
        <div className="tapes">
          {r.toTry ? <span className="tape">À tester</span> : null}
          {r.veg === 'oui' ? <span className="tape green">Végétarien</span> : null}
          {r.seasons.map((s) => (
            <span key={s} className={`tape ${s}`}>
              {labelOf(SEASONS, s)}
            </span>
          ))}
          {r.main ? <span className="tape">{r.main}</span> : null}
          {r.tags.map((t) => (
            <span key={t} className="tape">
              {t}
            </span>
          ))}
        </div>
        {info.length ? <p className="muted">{info.join(' · ')}</p> : <p className="muted">Pas encore classée.</p>}
        <div className="rating-line">
          <Stars value={r.rating} onChange={(n) => void patch(id, { rating: n })} label="Note de la recette" />
          <span className="muted">
            {r.journal.length
              ? `Faite ${r.journal.length} fois, la dernière ${ago(last)}`
              : r.toTry
                ? 'Pas encore essayée'
                : 'Jamais notée comme faite'}
          </span>
        </div>
      </div>

      {ingredients.length ? (
        <section className="block">
          <div className="block-head">
            <h3 className="block-title">Ingrédients</h3>
            <div className="stepper" role="group" aria-label="Nombre de personnes">
              <button type="button" aria-label="Moins de personnes" onClick={() => setServings(Math.max(1, target - 1))}>
                −
              </button>
              <span>
                {target} pers.
              </span>
              <button type="button" aria-label="Plus de personnes" onClick={() => setServings(Math.min(30, target + 1))}>
                +
              </button>
            </div>
          </div>
          {target !== base ? (
            <p className="hint">
              Quantités recalculées (écrites pour {base}).{' '}
              <button type="button" className="link" onClick={() => setServings(null)}>
                Revenir à {base}
              </button>
            </p>
          ) : null}
          <ul className="checklist">
            {ingredients.map((line, i) => (
              <li key={i}>
                <label>
                  <input
                    type="checkbox"
                    checked={!!ingDone[i]}
                    onChange={(e) => setIngDone({ ...ingDone, [i]: e.target.checked })}
                  />
                  <span>{scaleLine(line, factor)}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {steps.length ? (
        <section className="block">
          <h3 className="block-title">Préparation</h3>
          <ol className="steps">
            {steps.map((s, i) => {
              const t = timerFromStep(s)
              return (
                <li key={i} className={stepDone[i] ? 'done' : ''}>
                  <label>
                    <input
                      type="checkbox"
                      checked={!!stepDone[i]}
                      onChange={(e) => setStepDone({ ...stepDone, [i]: e.target.checked })}
                    />
                    <span>{s}</span>
                  </label>
                  {t ? (
                    <button
                      type="button"
                      className="btn ghost small timer-btn"
                      onClick={() => {
                        ui.startTimer(`${r.name} · étape ${i + 1}`, t.seconds)
                        ui.toast(`Minuteur de ${t.label} lancé.`)
                      }}
                    >
                      <IconTimer /> {t.label}
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ol>
        </section>
      ) : null}

      {!ingredients.length && !steps.length ? (
        <p className="muted">
          Pas encore d’ingrédients ni d’étapes.{' '}
          <button type="button" className="link" onClick={() => ui.open({ t: 'edit', id })}>
            Les ajouter
          </button>
        </p>
      ) : null}

      {r.notes ? (
        <section className="block">
          <h3 className="block-title">Notes</h3>
          <p className="prewrap">{r.notes}</p>
        </section>
      ) : null}

      {/^https?:\/\//i.test(r.source) ? (
        <section className="block">
          <h3 className="block-title">Source</h3>
          <a href={r.source} target="_blank" rel="noopener noreferrer" className="link">
            {r.source.replace(/^https?:\/\/(www\.)?/i, '').slice(0, 60)}
          </a>
        </section>
      ) : null}

      {journal.length ? (
        <section className="block">
          <h3 className="block-title">Journal</h3>
          <ul className="journal">
            {journal.map(({ e, i }) => (
              <li key={i}>
                <div>
                  <strong>{formatDay(e.date)}</strong>
                  {e.rating ? <span className="card-stars"> ★ {e.rating}</span> : null}
                  {e.comment ? <p>{e.comment}</p> : null}
                </div>
                <button
                  type="button"
                  className="link danger"
                  onClick={() => removeLog(id, i).then(() => ui.toast('Entrée retirée.'))}
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="danger-zone">
        <button type="button" className="btn ghost small danger" onClick={doDelete}>
          {confirmDelete ? 'Confirmer la suppression' : 'Supprimer la recette'}
        </button>
      </div>
    </Sheet>
  )
}
