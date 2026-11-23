import { useMemo, useState } from 'react'
import { BUDGETS, DIFFICULTIES, FAMILIES, KINDS, SEASONS, TIMES, VEGS, labelOf } from '../constants'
import { activeCount, EMPTY_FILTERS, needsSorting, type Filters } from '../filters'
import type { Recipe } from '../types'
import { currentSeason, uniqueSorted } from '../util'
import { ChoiceRow } from './Bits'
import { IconSearch } from './Icons'

interface Props {
  filters: Filters
  onChange(f: Filters): void
  /** Les recettes de cette liste : sert à proposer les cuisines, ingrédients et étiquettes qui existent. */
  recipes: Recipe[]
}

export function FilterBar({ filters: f, onChange, recipes }: Props) {
  const [open, setOpen] = useState(false)
  const set = (patch: Partial<Filters>) => onChange({ ...f, ...patch })
  const season = currentSeason()
  const n = activeCount(f)

  const options = useMemo(
    () => ({
      cuisines: uniqueSorted(recipes.map((r) => r.cuisine)),
      mains: uniqueSorted(recipes.map((r) => r.main)),
      tags: uniqueSorted(recipes.flatMap((r) => r.tags)),
      todo: recipes.filter(needsSorting).length,
      check: recipes.filter((r) => r.auto).length,
    }),
    [recipes],
  )

  return (
    <div className="filterbar">
      <div className="searchrow">
        <label className="search">
          <IconSearch />
          <input
            id="q"
            type="search"
            value={f.q}
            placeholder="Nom, ingrédient…"
            aria-label="Rechercher une recette"
            autoComplete="off"
            onChange={(e) => set({ q: e.target.value })}
          />
        </label>
        <button
          type="button"
          className="btn ghost"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          Filtres{n ? <span className="count-badge">{n}</span> : null}
        </button>
      </div>

      <div className="quick" role="group" aria-label="Filtres rapides">
        <button
          type="button"
          className="chip"
          aria-pressed={f.season === season}
          onClick={() => set({ season: f.season === season ? '' : season })}
        >
          {labelOf(SEASONS, season)} en ce moment
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={f.veg === 'oui'}
          onClick={() => set({ veg: f.veg === 'oui' ? '' : 'oui' })}
        >
          Végétarien
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={f.time === 'rapide'}
          onClick={() => set({ time: f.time === 'rapide' ? '' : 'rapide' })}
        >
          Rapide
        </button>
        <button type="button" className="chip" aria-pressed={f.top} onClick={() => set({ top: !f.top })}>
          ★ 4 et plus
        </button>
        {options.todo || f.todo ? (
          <button type="button" className="chip" aria-pressed={f.todo} onClick={() => set({ todo: !f.todo })}>
            À classer ({options.todo})
          </button>
        ) : null}
        {options.check || f.check ? (
          <button type="button" className="chip" aria-pressed={f.check} onClick={() => set({ check: !f.check })}>
            À vérifier ({options.check})
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="filter-panel">
          <section>
            <h3>Famille</h3>
            <ChoiceRow label="Famille" options={FAMILIES} value={f.family} onChange={(v) => set({ family: v })} />
          </section>
          <section>
            <h3>Type de plat</h3>
            <ChoiceRow label="Type de plat" options={KINDS} value={f.kind} onChange={(v) => set({ kind: v })} />
          </section>
          <section>
            <h3>Saison</h3>
            <ChoiceRow
              label="Saison"
              options={SEASONS.filter((s) => s.id !== 'toute')}
              value={f.season}
              onChange={(v) => set({ season: v })}
            />
          </section>
          <div className="two-col">
            <section>
              <h3>Régime</h3>
              <ChoiceRow label="Régime" options={VEGS} value={f.veg} onChange={(v) => set({ veg: v })} />
            </section>
            <section>
              <h3>Durée</h3>
              <ChoiceRow
                label="Durée"
                options={TIMES.map((t) => ({ ...t, hint: t.hint }))}
                value={f.time}
                onChange={(v) => set({ time: v })}
              />
            </section>
          </div>
          <div className="two-col">
            <section>
              <h3>Budget</h3>
              <ChoiceRow label="Budget" options={BUDGETS} value={f.budget || ''} onChange={(v) => set({ budget: v || 0 })} />
            </section>
            <section>
              <h3>Difficulté</h3>
              <ChoiceRow
                label="Difficulté"
                options={DIFFICULTIES}
                value={f.difficulty || ''}
                onChange={(v) => set({ difficulty: v || 0 })}
              />
            </section>
          </div>
          <div className="selects">
            <label>
              <span>Cuisine</span>
              <select value={f.cuisine} onChange={(e) => set({ cuisine: e.target.value })}>
                <option value="">Toutes</option>
                {options.cuisines.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Ingrédient principal</span>
              <select value={f.main} onChange={(e) => set({ main: e.target.value })}>
                <option value="">Tous</option>
                {options.mains.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Étiquette</span>
              <select value={f.tag} onChange={(e) => set({ tag: e.target.value })}>
                <option value="">Toutes</option>
                {options.tags.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="panel-foot">
            <span className="muted">{n ? `${n} filtre${n > 1 ? 's' : ''} actif${n > 1 ? 's' : ''}` : 'Aucun filtre actif'}</span>
            <button
              type="button"
              className="btn ghost small"
              disabled={!n && !f.q}
              onClick={() => onChange({ ...EMPTY_FILTERS })}
            >
              Tout effacer
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
