import { useEffect, useMemo, useState } from 'react'
import { RecipeCard } from '../components/RecipeCard'
import { SEASONS, labelOf } from '../constants'
import { fridgeSearch, IDEA_KINDS, pickIdeas, type IdeaKind } from '../ideas'
import { useStore } from '../store'
import { useUi } from '../ui'
import { currentSeason, hashStr, todayStr } from '../util'

const COUNT = 5

/** L'accueil : des idées du jour, qui changent à la demande. */
export function Ideas() {
  const { recipes, loaded } = useStore()
  const ui = useUi()
  const [which, setWhich] = useState<IdeaKind>('plat')
  const [round, setRound] = useState(0)
  const [ids, setIds] = useState<string[] | null>(null)
  const [fridge, setFridge] = useState('')

  const day = todayStr()
  const eligible = recipes.length

  // Les idées sont tirées une fois (par jour et par choix), puis gardées même si les recettes changent.
  useEffect(() => {
    if (!loaded || !eligible) return
    const seed = hashStr(`${day}|${which}|${round}`)
    setIds(pickIdeas(recipes, which, seed, COUNT).map((r) => r.id))
    // Volontairement sans `recipes` : un changement de note ne doit pas mélanger les idées affichées.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, eligible > 0, which, round, day])

  const shown = useMemo(
    () => (ids ?? []).map((id) => recipes.find((r) => r.id === id)).filter((r) => !!r),
    [ids, recipes],
  )

  function swap(id: string) {
    const current = ids ?? []
    const [next] = pickIdeas(recipes, which, Date.now() & 0x7fffffff, 1, current)
    if (!next) {
      ui.toast('Pas d’autre idée avec ce choix.')
      return
    }
    setIds(current.map((x) => (x === id ? next.id : x)))
  }

  const fridgeHits = useMemo(() => (fridge.trim() ? fridgeSearch(recipes, fridge).slice(0, 8) : []), [recipes, fridge])
  const toTry = useMemo(() => {
    const list = recipes.filter((r) => r.toTry)
    if (!list.length) return []
    const start = hashStr(day) % list.length
    return [list[start], list[(start + 1) % list.length]].filter((r, i, a) => a.indexOf(r) === i)
  }, [recipes, day])

  const season = currentSeason()
  const date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="page">
      <header className="ideas-head">
        <p className="date">{date}</p>
        <h1 className="page-title">Idées du jour</h1>
        <p className="muted">
          Des plats de {labelOf(SEASONS, season).toLowerCase()}, aimés, et pas faits depuis un moment.
        </p>
      </header>

      <div className="chips scroll" role="group" aria-label="Type d’idée">
        {IDEA_KINDS.map((k) => (
          <button key={k.id} type="button" className="chip" aria-pressed={which === k.id} onClick={() => setWhich(k.id)}>
            {k.label}
          </button>
        ))}
      </div>

      {!loaded ? (
        <p className="muted pad">Chargement…</p>
      ) : !recipes.length ? (
        <div className="empty">
          <h2>Pas encore de recettes</h2>
          <p>Ajoute les plats que vous avez déjà faits : les idées du jour apparaîtront ici.</p>
          <button type="button" className="btn" onClick={() => ui.open({ t: 'add' })}>
            Ajouter des recettes
          </button>
        </div>
      ) : shown.length === 0 ? (
        <div className="empty">
          <p>Aucune recette dans cette catégorie pour l’instant.</p>
        </div>
      ) : (
        <>
          <div className="grid">
            {shown.map((r) => (
              <RecipeCard
                key={r.id}
                recipe={r}
                onOpen={() => ui.open({ t: 'detail', id: r.id })}
                onSwap={() => swap(r.id)}
              />
            ))}
          </div>
          <button type="button" className="btn more" onClick={() => setRound((n) => n + 1)}>
            D’autres idées
          </button>
        </>
      )}

      {loaded && recipes.length > 0 ? (
        <section className="block">
          <h2 className="block-title">Selon ce qu’on a sous la main</h2>
          <input
            id="fridge"
            type="text"
            className="input"
            value={fridge}
            placeholder="poulet, courgette, riz…"
            aria-label="Ingrédients disponibles"
            onChange={(e) => setFridge(e.target.value)}
          />
          {fridge.trim() ? (
            fridgeHits.length ? (
              <div className="grid">
                {fridgeHits.map((h) => (
                  <div key={h.recipe.id} className="hit">
                    <RecipeCard recipe={h.recipe} onOpen={() => ui.open({ t: 'detail', id: h.recipe.id })} />
                    <p className="hit-note">Contient : {h.hits.join(', ')}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">Aucune recette ne contient ça. Les ingrédients ne sont lus que sur les fiches remplies.</p>
            )
          ) : null}
        </section>
      ) : null}

      {toTry.length ? (
        <section className="block">
          <h2 className="block-title">Et si on testait ?</h2>
          <div className="grid">
            {toTry.map((r) => (
              <RecipeCard key={r.id} recipe={r} onOpen={() => ui.open({ t: 'detail', id: r.id })} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
