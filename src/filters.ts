import { familyOf, type Family } from './constants'
import type { Kind, Level, Recipe, Season, TimeBucket, Veg } from './types'
import { byName, currentSeason, lastMade, norm } from './util'

export interface Filters {
  q: string
  season: Season | ''
  veg: Veg | ''
  kind: Kind | ''
  family: Family | ''
  time: TimeBucket | ''
  budget: Level
  difficulty: Level
  cuisine: string
  main: string
  tag: string
  /** 4 étoiles et plus. */
  top: boolean
  /** Recettes qu'il reste à classer. */
  todo: boolean
  /** Classements proposés par Claude, pas encore relus. */
  check: boolean
}

export const EMPTY_FILTERS: Filters = {
  q: '',
  season: '',
  veg: '',
  kind: '',
  family: '',
  time: '',
  budget: 0,
  difficulty: 0,
  cuisine: '',
  main: '',
  tag: '',
  top: false,
  todo: false,
  check: false,
}

/** Une recette est « à classer » tant qu'il lui manque le type, la durée ou la saison. */
export function needsSorting(r: Recipe): boolean {
  return !r.kind || !r.time || r.seasons.length === 0
}

export function searchText(r: Recipe): string {
  return norm([r.name, r.main, r.cuisine, r.tags.join(' '), r.ingredients].join(' '))
}

export function matches(r: Recipe, f: Filters): boolean {
  if (f.q) {
    const hay = searchText(r)
    if (!norm(f.q).split(' ').every((w) => hay.includes(w))) return false
  }
  if (f.season) {
    if (f.season === 'toute') {
      if (!r.seasons.includes('toute')) return false
    } else if (!r.seasons.includes(f.season) && !r.seasons.includes('toute')) return false
  }
  if (f.veg && r.veg !== f.veg) return false
  if (f.kind && r.kind !== f.kind) return false
  if (f.family && familyOf(r.kind) !== f.family) return false
  if (f.time && r.time !== f.time) return false
  if (f.budget && r.budget !== f.budget) return false
  if (f.difficulty && r.difficulty !== f.difficulty) return false
  if (f.cuisine && norm(r.cuisine) !== norm(f.cuisine)) return false
  if (f.main && norm(r.main) !== norm(f.main)) return false
  if (f.tag && !r.tags.some((t) => norm(t) === norm(f.tag))) return false
  if (f.top && r.rating < 4) return false
  if (f.todo && !needsSorting(r)) return false
  if (f.check && !r.auto) return false
  return true
}

/** Nombre de filtres actifs (la recherche n'est pas comptée). */
export function activeCount(f: Filters): number {
  return (
    (['season', 'veg', 'kind', 'family', 'time', 'cuisine', 'main', 'tag'] as const).filter((k) => f[k]).length +
    (f.budget ? 1 : 0) +
    (f.difficulty ? 1 : 0) +
    (f.top ? 1 : 0) +
    (f.todo ? 1 : 0) +
    (f.check ? 1 : 0)
  )
}

export type SortKey = 'az' | 'old' | 'rating' | 'new'

export const SORTS: { id: SortKey; label: string }[] = [
  { id: 'az', label: 'A → Z' },
  { id: 'old', label: 'Pas faites depuis longtemps' },
  { id: 'rating', label: 'Mieux notées' },
  { id: 'new', label: 'Dernières ajoutées' },
]

export function sortRecipes(list: Recipe[], key: SortKey): Recipe[] {
  const a = list.slice()
  if (key === 'az') return a.sort(byName)
  if (key === 'old') {
    return a.sort((x, y) => {
      const p = lastMade(x)
      const q = lastMade(y)
      if (p && !q) return -1
      if (!p && q) return 1
      return p < q ? -1 : p > q ? 1 : byName(x, y)
    })
  }
  if (key === 'rating') return a.sort((x, y) => y.rating - x.rating || byName(x, y))
  return a.sort((x, y) => y.createdAt - x.createdAt || byName(x, y))
}

export function seasonQuickId(): Exclude<Season, 'toute'> {
  return currentSeason()
}
