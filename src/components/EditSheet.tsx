import { useMemo, useState } from 'react'
import { AiError, classifyNames } from '../ai'
import { BUDGETS, DIFFICULTIES, KINDS, SEASONS, TIMES, VEGS } from '../constants'
import { useSettings } from '../settings'
import { useStore } from '../store'
import { emptyDraft, type Recipe, type RecipeDraft } from '../types'
import { useUi, type Overlay } from '../ui'
import { norm, uniqueSorted } from '../util'
import { ChoiceRow, Field, MultiChoiceRow } from './Bits'
import { Sheet } from './Sheet'

type EditOverlay = Extract<Overlay, { t: 'edit' }>

export function EditSheet({ id, draft: initial, queue }: Omit<EditOverlay, 't'>) {
  const store = useStore()
  const { settings } = useSettings()
  const ui = useUi()
  const existing = id ? store.recipes.find((r) => r.id === id) : undefined
  const [form, setForm] = useState<RecipeDraft>(() => {
    if (existing) {
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = existing
      return rest
    }
    return { ...emptyDraft(), servings: settings.servings, ...initial }
  })
  const [tagInput, setTagInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [asking, setAsking] = useState(false)

  const set = (patch: Partial<RecipeDraft>) => setForm((f) => ({ ...f, ...patch }))

  const suggestions = useMemo(
    () => ({
      cuisines: uniqueSorted(store.recipes.map((r) => r.cuisine)),
      mains: uniqueSorted(store.recipes.map((r) => r.main)),
      tags: uniqueSorted(store.recipes.flatMap((r) => r.tags)),
    }),
    [store.recipes],
  )

  const queueIndex = queue && id ? queue.indexOf(id) : -1
  const nextId = queue && queueIndex >= 0 ? queue[queueIndex + 1] : undefined

  function addTag(raw: string) {
    const tags = raw
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
    if (!tags.length) return
    const merged = [...form.tags]
    for (const t of tags) if (!merged.some((x) => norm(x) === norm(t))) merged.push(t)
    set({ tags: merged })
    setTagInput('')
  }

  async function suggest() {
    if (!form.name.trim()) {
      ui.toast('Écris d’abord le nom de la recette.')
      return
    }
    setAsking(true)
    try {
      const [res] = await classifyNames(settings, [form.name.trim()])
      if (!res) {
        ui.toast('Claude n’a rien proposé. Réessaie.')
        return
      }
      // Seuls les champs encore vides sont remplis.
      setForm((f) => ({
        ...f,
        kind: f.kind || res.kind || '',
        veg: f.veg || res.veg || '',
        time: f.time || res.time || '',
        seasons: f.seasons.length ? f.seasons : (res.seasons ?? []),
        cuisine: f.cuisine || res.cuisine || '',
        main: f.main || res.main || '',
        budget: f.budget || res.budget || 0,
        difficulty: f.difficulty || res.difficulty || 0,
        tags: f.tags.length ? f.tags : (res.tags ?? []),
      }))
      ui.toast('Classement proposé : relis-le avant d’enregistrer.')
    } catch (e) {
      ui.toast(e instanceof AiError ? e.message : 'La suggestion a échoué.')
    } finally {
      setAsking(false)
    }
  }

  async function submit(goNext: boolean) {
    const name = form.name.trim()
    if (!name) {
      ui.toast('Donne un nom à la recette.')
      document.getElementById('f-name')?.focus()
      return
    }
    const clash = store.recipes.some((r) => r.id !== id && norm(r.name) === norm(name))
    if (clash) {
      ui.toast('Une recette porte déjà ce nom.')
      return
    }
    setBusy(true)
    try {
      const data: RecipeDraft = {
        ...form,
        name,
        tags: [...form.tags, ...tagInput.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)],
        cuisine: form.cuisine.trim(),
        main: form.main.trim(),
        source: form.source.trim(),
        // Un classement relu et enregistré à la main n'est plus « proposé ».
        auto: existing && existing.auto ? false : form.auto,
      }
      if (existing) {
        const saved: Recipe = { ...existing, ...data }
        await store.save(saved)
        ui.toast('Recette enregistrée.')
        if (goNext && nextId) ui.replace({ t: 'edit', id: nextId, queue })
        else ui.close()
      } else {
        const newId = await store.create(data)
        ui.toast('Recette ajoutée.')
        ui.replace({ t: 'detail', id: newId })
      }
    } catch {
      setBusy(false)
      ui.toast('Enregistrement impossible. Réessaie.')
    }
  }

  const title = existing ? 'Modifier la recette' : 'Nouvelle recette'
  const progress = queue && queueIndex >= 0 ? ` (${queueIndex + 1}/${queue.length})` : ''

  return (
    <Sheet
      title={`${title}${progress}`}
      footer={
        <>
          <button type="button" className="btn grow" disabled={busy} onClick={() => submit(false)}>
            Enregistrer
          </button>
          {nextId ? (
            <button type="button" className="btn ghost" disabled={busy} onClick={() => submit(true)}>
              Enregistrer et suivante
            </button>
          ) : (
            <button type="button" className="btn ghost" onClick={() => ui.close()}>
              Annuler
            </button>
          )}
        </>
      }
    >
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          void submit(false)
        }}
      >
        <Field label="Nom de la recette" htmlFor="f-name">
          <input
            id="f-name"
            className="input big"
            value={form.name}
            placeholder="Gratin dauphinois"
            onChange={(e) => set({ name: e.target.value })}
          />
        </Field>

        <div className="suggest">
          <button type="button" className="btn small" disabled={asking || !settings.apiKey} onClick={suggest}>
            {asking ? 'Claude réfléchit…' : 'Compléter avec Claude'}
          </button>
          <span className="hint">
            {settings.apiKey
              ? 'Propose le type, la saison, la durée… à partir du nom.'
              : 'Ajoute ta clé API dans les réglages pour l’utiliser.'}
          </span>
        </div>

        <Field label="Type">
          <ChoiceRow label="Type" options={KINDS} value={form.kind} onChange={(v) => set({ kind: v })} />
        </Field>
        <Field label="Régime">
          <ChoiceRow label="Régime" options={VEGS} value={form.veg} onChange={(v) => set({ veg: v })} />
        </Field>
        <Field label="Durée">
          <ChoiceRow label="Durée" options={TIMES} value={form.time} onChange={(v) => set({ time: v })} />
        </Field>
        <Field label="Saisons" hint="Plusieurs possibles. « Toute l’année » si aucune saison ne s’impose.">
          <MultiChoiceRow
            label="Saisons"
            options={SEASONS}
            value={form.seasons}
            onChange={(v) => set({ seasons: v.includes('toute') && !form.seasons.includes('toute') ? ['toute'] : v.filter((s) => s !== 'toute') })}
          />
        </Field>

        <div className="two-col">
          <Field label="Cuisine" htmlFor="f-cuisine">
            <input
              id="f-cuisine"
              className="input"
              list="dl-cuisine"
              value={form.cuisine}
              placeholder="Italienne, indienne…"
              onChange={(e) => set({ cuisine: e.target.value })}
            />
          </Field>
          <Field label="Ingrédient principal" htmlFor="f-main">
            <input
              id="f-main"
              className="input"
              list="dl-main"
              value={form.main}
              placeholder="Courge, poulet…"
              onChange={(e) => set({ main: e.target.value })}
            />
          </Field>
        </div>
        <datalist id="dl-cuisine">
          {suggestions.cuisines.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <datalist id="dl-main">
          {suggestions.mains.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <datalist id="dl-tags">
          {suggestions.tags.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        <div className="two-col">
          <Field label="Budget">
            <ChoiceRow label="Budget" options={BUDGETS} value={form.budget || ''} onChange={(v) => set({ budget: v || 0 })} />
          </Field>
          <Field label="Difficulté">
            <ChoiceRow
              label="Difficulté"
              options={DIFFICULTIES}
              value={form.difficulty || ''}
              onChange={(v) => set({ difficulty: v || 0 })}
            />
          </Field>
        </div>

        <Field label="Étiquettes" htmlFor="f-tag" hint="Les tiennes : réconfort, invités, four… Valide avec Entrée ou une virgule.">
          <div className="tag-edit">
            {form.tags.map((t) => (
              <button
                key={t}
                type="button"
                className="tape removable"
                aria-label={`Retirer l’étiquette ${t}`}
                onClick={() => set({ tags: form.tags.filter((x) => x !== t) })}
              >
                {t} ×
              </button>
            ))}
            <input
              id="f-tag"
              className="input"
              list="dl-tags"
              value={tagInput}
              placeholder="Ajouter une étiquette"
              onChange={(e) => {
                const v = e.target.value
                if (v.includes(',')) addTag(v)
                else setTagInput(v)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag(tagInput)
                }
              }}
              onBlur={() => addTag(tagInput)}
            />
          </div>
        </Field>

        <label className="check">
          <input type="checkbox" checked={form.toTry} onChange={(e) => set({ toTry: e.target.checked })} />
          <span>À tester (pas encore faite)</span>
        </label>

        <Field label="Note">
          <ChoiceRow
            label="Note"
            options={[1, 2, 3, 4, 5].map((n) => ({ id: n, label: '★'.repeat(n) }))}
            value={form.rating || ''}
            onChange={(v) => set({ rating: v || 0 })}
          />
        </Field>

        <Field label="Pour combien de personnes sont écrites les quantités ?" htmlFor="f-serv">
          <input
            id="f-serv"
            className="input short"
            type="number"
            min={1}
            max={30}
            inputMode="numeric"
            value={form.servings}
            onChange={(e) => set({ servings: Math.max(1, Math.min(30, Math.round(Number(e.target.value)) || 1)) })}
          />
        </Field>
        <Field label="Ingrédients" htmlFor="f-ing" hint="Un ingrédient par ligne, la quantité en premier : 200 g de farine.">
          <textarea id="f-ing" className="input" rows={7} value={form.ingredients} onChange={(e) => set({ ingredients: e.target.value })} />
        </Field>
        <Field label="Préparation" htmlFor="f-steps" hint="Une étape par ligne. Les durées (« 20 min ») deviennent des boutons minuteur.">
          <textarea id="f-steps" className="input" rows={8} value={form.steps} onChange={(e) => set({ steps: e.target.value })} />
        </Field>
        <Field label="Notes" htmlFor="f-notes">
          <textarea id="f-notes" className="input" rows={3} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
        <Field label="Où trouver la recette" htmlFor="f-src" hint="Un lien, ou un livre, une page, le classeur…">
          <input
            id="f-src"
            className="input"
            type="text"
            value={form.source}
            placeholder="https:// ou « livre orange p450 »"
            onChange={(e) => set({ source: e.target.value })}
          />
        </Field>
      </form>
    </Sheet>
  )
}
