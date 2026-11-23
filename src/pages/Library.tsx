import { useMemo, useState } from 'react'
import { classifyRecipes } from '../autoclass'
import { AiError } from '../ai'
import { FilterBar } from '../components/FilterBar'
import { RecipeCard } from '../components/RecipeCard'
import { EMPTY_FILTERS, matches, needsSorting, SORTS, sortRecipes, type Filters, type SortKey } from '../filters'
import { useSettings } from '../settings'
import { useStore } from '../store'
import { useUi } from '../ui'

const PAGE = 80

interface Props {
  /** « all » : les recettes déjà faites ; « try » : celles qu'il reste à tester. */
  scope: 'all' | 'try'
}

export function Library({ scope }: Props) {
  const { recipes, loaded, patchMany } = useStore()
  const { settings } = useSettings()
  const ui = useUi()
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [sort, setSort] = useState<SortKey>('az')
  const [limit, setLimit] = useState(PAGE)
  const [busy, setBusy] = useState('')

  const scoped = useMemo(() => recipes.filter((r) => r.toTry === (scope === 'try')), [recipes, scope])
  const shown = useMemo(() => sortRecipes(scoped.filter((r) => matches(r, filters)), sort), [scoped, filters, sort])
  const unsorted = useMemo(() => scoped.filter(needsSorting), [scoped])

  const change = (f: Filters) => {
    setFilters(f)
    setLimit(PAGE)
  }

  async function classifyAll() {
    if (!settings.apiKey) {
      ui.toast('Ajoute ta clé API dans les réglages pour classer avec Claude.')
      return
    }
    setBusy('Classement en cours…')
    try {
      const n = await classifyRecipes(settings, { patchMany }, unsorted, (d, t) => setBusy(`Classement… ${d}/${t}`))
      ui.toast(n ? `${n} recette${n > 1 ? 's' : ''} classée${n > 1 ? 's' : ''}. Filtre « À vérifier » pour les relire.` : 'Rien de plus à classer.')
    } catch (e) {
      ui.toast(e instanceof AiError ? e.message : 'Le classement a échoué. Réessaie.')
    } finally {
      setBusy('')
    }
  }

  const empty = loaded && scoped.length === 0

  return (
    <div className="page">
      <h1 className="page-title">{scope === 'try' ? 'À tester' : 'Recettes'}</h1>
      <FilterBar filters={filters} onChange={change} recipes={scoped} />

      {unsorted.length > 0 && scope === 'all' ? (
        <div className="notice">
          <p>
            <strong>{unsorted.length}</strong> recette{unsorted.length > 1 ? 's' : ''} à classer (type, durée ou saison
            manquants).
          </p>
          <div className="notice-actions">
            <button type="button" className="btn small" disabled={!!busy} onClick={classifyAll}>
              {busy || 'Classer avec Claude'}
            </button>
            <button
              type="button"
              className="btn ghost small"
              disabled={!!busy}
              onClick={() => ui.open({ t: 'edit', id: unsorted[0].id, queue: unsorted.map((r) => r.id) })}
            >
              Une par une
            </button>
          </div>
        </div>
      ) : null}

      {!empty ? (
        <div className="results-bar">
          <span className="muted">
            {shown.length === scoped.length ? `${shown.length} recette${shown.length > 1 ? 's' : ''}` : `${shown.length} sur ${scoped.length}`}
          </span>
          <label className="sort">
            <span className="sr-only">Trier</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {!loaded ? (
        <p className="muted pad">Chargement des recettes…</p>
      ) : empty ? (
        <div className="empty">
          <h2>{scope === 'try' ? 'Rien à tester pour l’instant' : 'Le carnet est vide'}</h2>
          <p>
            {scope === 'try'
              ? 'Ajoute ici les recettes qui te font envie. Elles passent dans le carnet dès que vous les avez faites.'
              : 'Colle la liste des plats que vous avez déjà faits, un par ligne, ou prends en photo une page du carnet.'}
          </p>
          <button type="button" className="btn" onClick={() => ui.open({ t: 'add' })}>
            Ajouter des recettes
          </button>
        </div>
      ) : shown.length === 0 ? (
        <div className="empty">
          <p>Aucune recette ne correspond.</p>
          <button type="button" className="btn ghost" onClick={() => change({ ...EMPTY_FILTERS })}>
            Effacer les filtres
          </button>
        </div>
      ) : (
        <>
          <div className="grid">
            {shown.slice(0, limit).map((r) => (
              <RecipeCard key={r.id} recipe={r} onOpen={() => ui.open({ t: 'detail', id: r.id })} />
            ))}
          </div>
          {shown.length > limit ? (
            <button type="button" className="btn ghost more" onClick={() => setLimit((l) => l + PAGE)}>
              Afficher {Math.min(PAGE, shown.length - limit)} de plus
            </button>
          ) : null}
        </>
      )}
    </div>
  )
}
