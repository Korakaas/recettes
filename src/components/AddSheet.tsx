import { useState, type ReactNode } from 'react'
import {
  AiError,
  importFromImage,
  importFromText,
  importFromUrl,
  photoToBase64,
  type Extracted,
} from '../ai'
import { classifyRecipes } from '../autoclass'
import { KINDS, labelOf } from '../constants'
import { useSettings } from '../settings'
import { useStore } from '../store'
import { emptyDraft, type Recipe, type RecipeDraft } from '../types'
import { useUi } from '../ui'
import { norm } from '../util'
import { Field } from './Bits'
import { Sheet } from './Sheet'

type Mode = 'menu' | 'url' | 'text' | 'list' | 'photo'
type Draft = Partial<RecipeDraft> & { name: string }

/** Une ligne par plat ; les puces et numéros en début de ligne sont retirés. */
export function parseNames(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of text.split('\n')) {
    const name = line.replace(/^\s*(?:[-–—•*·]+|\d+[.)])\s*/, '').trim()
    if (name && !seen.has(norm(name))) {
      seen.add(norm(name))
      out.push(name)
    }
  }
  return out
}

export function AddSheet() {
  const store = useStore()
  const { settings } = useSettings()
  const ui = useUi()
  const [mode, setMode] = useState<Mode>('menu')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [listText, setListText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [toTry, setToTry] = useState(false)
  const [classify, setClassify] = useState(true)
  const [preview, setPreview] = useState<Draft[] | null>(null)
  const [picked, setPicked] = useState<Record<number, boolean>>({})

  const hasKey = !!settings.apiKey
  const existingNames = new Set(store.recipes.map((r) => norm(r.name)))

  function go(m: Mode) {
    setMode(m)
    setError('')
    setPreview(null)
    setToTry(m === 'url')
  }

  /** Une seule recette lue : on l'ouvre dans le formulaire pour la relire. Plusieurs : on les liste. */
  function handleExtracted(res: Extracted) {
    if (!res.found) {
      setError(res.message || 'Aucune recette lisible trouvée.')
      return
    }
    if (res.drafts.length === 1) {
      const d = res.drafts[0]
      ui.replace({ t: 'edit', draft: { ...d, toTry, auto: true } })
      return
    }
    setPreview(res.drafts)
    setPicked(Object.fromEntries(res.drafts.map((_, i) => [i, true])))
  }

  async function runAi(fn: () => Promise<Extracted>, label: string) {
    setError('')
    setBusy(label)
    try {
      handleExtracted(await fn())
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'L’import a échoué. Réessaie.')
    } finally {
      setBusy('')
    }
  }

  function submitUrl() {
    const u = url.trim()
    if (!/^https?:\/\/\S+$/i.test(u)) {
      setError('Colle une adresse qui commence par https://')
      return
    }
    void runAi(() => importFromUrl(settings, u), 'Claude lit la page…')
  }

  function submitText() {
    if (text.trim().length < 20) {
      setError('Colle le texte complet de la recette.')
      return
    }
    void runAi(() => importFromText(settings, text), 'Claude lit le texte…')
  }

  function submitPhotos() {
    if (!files.length) {
      setError('Choisis au moins une photo.')
      return
    }
    void runAi(async () => {
      const all: Extracted = { found: false, message: '', drafts: [] }
      for (let i = 0; i < files.length; i++) {
        setBusy(`Claude lit la photo ${i + 1}/${files.length}…`)
        const res = await importFromImage(settings, await photoToBase64(files[i]))
        all.drafts.push(...res.drafts)
        if (res.message) all.message = res.message
      }
      // Les doublons entre photos (même plat sur deux pages) sont retirés.
      const seen = new Set<string>()
      all.drafts = all.drafts.filter((d) => {
        const k = norm(d.name ?? '')
        if (!k || seen.has(k)) return false
        seen.add(k)
        return true
      })
      all.found = all.drafts.length > 0
      return all
    }, 'Claude lit la photo…')
  }

  async function saveMany(drafts: Draft[], withClassify: boolean) {
    const fresh = drafts.filter((d) => !existingNames.has(norm(d.name)))
    const skipped = drafts.length - fresh.length
    if (!fresh.length) {
      setError('Ces recettes existent déjà.')
      return
    }
    setBusy('Ajout en cours…')
    try {
      const payload = fresh.map((d) => ({ ...d, toTry: toTry || d.toTry === true }))
      const ids = await store.addMany(payload)
      let note = ''
      if (withClassify && hasKey) {
        const now = Date.now()
        const made: Recipe[] = ids.map((id, i) => ({
          ...emptyDraft(),
          ...payload[i],
          id,
          createdAt: now,
          updatedAt: now,
        }))
        const todo = made.filter((r) => !r.kind || !r.time || !r.seasons.length)
        if (todo.length) {
          try {
            await classifyRecipes(settings, store, todo, (d, t) => setBusy(`Classement… ${d}/${t}`))
          } catch (e) {
            note = ` Le classement s’est arrêté : ${e instanceof AiError ? e.message : 'erreur'} Relance-le depuis « Recettes ».`
          }
        }
      }
      ui.close()
      ui.toast(
        `${ids.length} recette${ids.length > 1 ? 's ajoutées' : ' ajoutée'}${skipped ? ` (${skipped} déjà présente${skipped > 1 ? 's' : ''})` : ''}.${note}`,
      )
    } catch {
      setBusy('')
      setError('Ajout impossible. Vérifie ta connexion et réessaie.')
    }
  }

  const names = parseNames(listText)
  const newNames = names.filter((n) => !existingNames.has(norm(n)))

  let body: ReactNode
  if (preview) {
    const selected = preview.filter((_, i) => picked[i])
    body = (
      <>
        <p className="muted">
          Claude a trouvé {preview.length} recette{preview.length > 1 ? 's' : ''}. Décoche celles à ne pas garder.
        </p>
        <ul className="checklist big">
          {preview.map((d, i) => (
            <li key={i}>
              <label>
                <input
                  type="checkbox"
                  checked={!!picked[i]}
                  onChange={(e) => setPicked({ ...picked, [i]: e.target.checked })}
                />
                <span>
                  {d.name}
                  {d.kind ? <small className="muted"> · {labelOf(KINDS, d.kind)}</small> : null}
                  {existingNames.has(norm(d.name)) ? <small className="muted"> · déjà dans le carnet</small> : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <label className="check">
          <input type="checkbox" checked={toTry} onChange={(e) => setToTry(e.target.checked)} />
          <span>Ce sont des recettes à tester</span>
        </label>
        {error ? <p className="error">{error}</p> : null}
        <div className="row">
          <button
            type="button"
            className="btn"
            disabled={!selected.length || !!busy}
            onClick={() => saveMany(selected.map((d) => ({ ...d, auto: !!d.kind })), false)}
          >
            {busy || `Ajouter ${selected.length} recette${selected.length > 1 ? 's' : ''}`}
          </button>
          <button type="button" className="btn ghost" onClick={() => setPreview(null)}>
            Retour
          </button>
        </div>
      </>
    )
  } else if (mode === 'menu') {
    body = (
      <div className="choices">
        <button type="button" className="choice" onClick={() => ui.replace({ t: 'edit' })}>
          <strong>Une recette</strong>
          <span>Saisir le nom, puis les détails si tu veux.</span>
        </button>
        <button type="button" className="choice" onClick={() => go('url')}>
          <strong>Un lien</strong>
          <span>Un site de recettes ou une vidéo : Claude lit la page.</span>
        </button>
        <button type="button" className="choice" onClick={() => go('list')}>
          <strong>Une liste de noms</strong>
          <span>Colle les plats déjà faits, un par ligne. Idéal pour démarrer.</span>
        </button>
        <button type="button" className="choice" onClick={() => go('photo')}>
          <strong>Une photo</strong>
          <span>Une page du carnet ou d’un livre de cuisine.</span>
        </button>
        <button type="button" className="choice" onClick={() => go('text')}>
          <strong>Du texte copié</strong>
          <span>La recette copiée depuis un site ou la description d’une vidéo.</span>
        </button>
      </div>
    )
  } else {
    const needKey = mode !== 'list' && !hasKey
    body = (
      <>
        <button type="button" className="link back" onClick={() => go('menu')}>
          ← Autres façons d’ajouter
        </button>
        {needKey ? (
          <div className="notice">
            <p>Pour lire un lien, un texte ou une photo, il faut ta clé API Claude.</p>
            <div className="notice-actions">
              <button type="button" className="btn small" onClick={() => ui.open({ t: 'settings' })}>
                Ouvrir les réglages
              </button>
            </div>
          </div>
        ) : null}

        {mode === 'url' ? (
          <>
            <Field
              label="Adresse de la recette"
              htmlFor="add-url"
              hint="Site de recettes, blog ou vidéo. Pour Instagram et TikTok, la lecture échoue souvent : colle alors la légende en « Du texte copié »."
            >
              <input
                id="add-url"
                className="input"
                type="url"
                inputMode="url"
                value={url}
                placeholder="https://"
                onChange={(e) => setUrl(e.target.value)}
              />
            </Field>
            <label className="check">
              <input type="checkbox" checked={toTry} onChange={(e) => setToTry(e.target.checked)} />
              <span>À tester (pas encore faite)</span>
            </label>
            <div className="row">
              <button type="button" className="btn" disabled={!!busy || needKey} onClick={submitUrl}>
                {busy || 'Importer'}
              </button>
              <button type="button" className="btn ghost" onClick={() => go('text')}>
                Coller le texte à la place
              </button>
            </div>
          </>
        ) : null}

        {mode === 'text' ? (
          <>
            <Field label="Texte de la recette" htmlFor="add-text" hint="Ingrédients et étapes, copiés tels quels.">
              <textarea
                id="add-text"
                className="input"
                rows={10}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </Field>
            <label className="check">
              <input type="checkbox" checked={toTry} onChange={(e) => setToTry(e.target.checked)} />
              <span>À tester (pas encore faite)</span>
            </label>
            <div className="row">
              <button type="button" className="btn" disabled={!!busy || needKey} onClick={submitText}>
                {busy || 'Lire la recette'}
              </button>
            </div>
          </>
        ) : null}

        {mode === 'photo' ? (
          <>
            <Field
              label="Photos"
              htmlFor="add-photo"
              hint="Jusqu’à 6 photos : pages du carnet (liste de plats) ou recette détaillée."
            >
              <input
                id="add-photo"
                className="input"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 6))}
              />
            </Field>
            {files.length ? <p className="muted">{files.length} photo{files.length > 1 ? 's' : ''} choisie{files.length > 1 ? 's' : ''}.</p> : null}
            <label className="check">
              <input type="checkbox" checked={toTry} onChange={(e) => setToTry(e.target.checked)} />
              <span>À tester (pas encore faites)</span>
            </label>
            <div className="row">
              <button type="button" className="btn" disabled={!!busy || needKey} onClick={submitPhotos}>
                {busy || 'Lire les photos'}
              </button>
            </div>
          </>
        ) : null}

        {mode === 'list' ? (
          <>
            <Field label="Un plat par ligne" htmlFor="add-list" hint="Les puces et les numéros en début de ligne sont ignorés.">
              <textarea
                id="add-list"
                className="input"
                rows={12}
                value={listText}
                placeholder={'Gratin dauphinois\nCurry de pois chiches\nTarte aux pommes'}
                onChange={(e) => setListText(e.target.value)}
              />
            </Field>
            <label className="check">
              <input type="checkbox" checked={toTry} onChange={(e) => setToTry(e.target.checked)} />
              <span>Ce sont des recettes à tester</span>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={classify && hasKey}
                disabled={!hasKey}
                onChange={(e) => setClassify(e.target.checked)}
              />
              <span>
                Classer avec Claude après l’ajout{hasKey ? '' : ' (clé API manquante)'}
              </span>
            </label>
            <div className="row">
              <button
                type="button"
                className="btn"
                disabled={!newNames.length || !!busy}
                onClick={() => saveMany(newNames.map((name) => ({ name })), classify)}
              >
                {busy ||
                  (newNames.length
                    ? `Ajouter ${newNames.length} recette${newNames.length > 1 ? 's' : ''}`
                    : 'Ajouter')}
              </button>
              {names.length > newNames.length ? (
                <span className="muted">{names.length - newNames.length} déjà dans le carnet</span>
              ) : null}
            </div>
          </>
        ) : null}

        {error ? <p className="error">{error}</p> : null}
      </>
    )
  }

  return <Sheet title="Ajouter des recettes">{body}</Sheet>
}
