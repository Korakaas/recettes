import { useState } from 'react'
import { useStore } from '../store'
import { useUi } from '../ui'
import { todayStr } from '../util'
import { Field, Stars } from './Bits'
import { Sheet } from './Sheet'

/** « Je l'ai faite » : une ligne de plus dans le journal de la recette. */
export function LogSheet({ id }: { id: string }) {
  const { recipes, logMade } = useStore()
  const ui = useUi()
  const r = recipes.find((x) => x.id === id)
  const [date, setDate] = useState(todayStr())
  const [rating, setRating] = useState(r?.rating ?? 0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!date) {
      ui.toast('Choisis une date.')
      return
    }
    setBusy(true)
    try {
      await logMade(id, { date, ...(rating ? { rating } : {}), ...(comment.trim() ? { comment: comment.trim() } : {}) })
      ui.close()
      ui.toast('Ajoutée au journal.')
    } catch {
      setBusy(false)
      ui.toast('Enregistrement impossible. Réessaie.')
    }
  }

  return (
    <Sheet
      title={r ? `Faite : ${r.name}` : 'Faite'}
      footer={
        <>
          <button type="button" className="btn grow" disabled={busy} onClick={submit}>
            Enregistrer
          </button>
          <button type="button" className="btn ghost" onClick={() => ui.close()}>
            Annuler
          </button>
        </>
      }
    >
      <Field label="Date" htmlFor="log-date">
        <input id="log-date" type="date" className="input" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Note du jour" hint="Elle devient la note de la recette.">
        <Stars value={rating} onChange={setRating} label="Note du jour" />
      </Field>
      <Field label="Remarque" htmlFor="log-comment" hint="Par exemple : moins de sel, les invités ont adoré.">
        <textarea
          id="log-comment"
          className="input"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </Field>
    </Sheet>
  )
}
