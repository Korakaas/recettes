import type { Recipe } from './types'
import { currentSeason, daysSince, lastMade, norm, rng } from './util'
import { searchText } from './filters'

export type IdeaKind = 'plat' | 'cote' | 'sucre' | 'pain' | 'tout'

export const IDEA_KINDS: { id: IdeaKind; label: string }[] = [
  { id: 'plat', label: 'Plats' },
  { id: 'cote', label: 'Entrées, accompagnements' },
  { id: 'sucre', label: 'Sucré' },
  { id: 'pain', label: 'Pain' },
  { id: 'tout', label: 'Tout' },
]

function inPool(r: Recipe, which: IdeaKind): boolean {
  if (r.toTry) return false
  switch (which) {
    case 'plat':
      return r.kind === 'plat' || r.kind === ''
    case 'cote':
      return r.kind === 'entree' || r.kind === 'accompagnement' || r.kind === 'apero'
    case 'sucre':
      return r.kind === 'dessert' || r.kind === 'gateau'
    case 'pain':
      return r.kind === 'pain'
    default:
      return true
  }
}

interface Scored {
  recipe: Recipe
  /** Écartée au premier tour : faite récemment ou hors saison. */
  hard: boolean
  weight: number
}

function score(r: Recipe, now: Date): Scored {
  const season = currentSeason(now)
  let s = 0
  let hard = false
  const rating = [0, -2, -1, 1, 3, 4][r.rating] ?? 0
  s += rating
  if (r.seasons.length) {
    if (r.seasons.includes(season)) s += 2
    else if (r.seasons.includes('toute')) s += 1
    else hard = true
  }
  const last = lastMade(r)
  if (!last) {
    s += 1
  } else {
    const d = daysSince(last, now) ?? 0
    if (d < 21) hard = true
    else if (d < 60) s -= 1
    else if (d < 120) s += 1
    else if (d < 300) s += 2
    else s += 3
  }
  if (r.kind === '') s -= 1
  return { recipe: r, hard, weight: Math.exp(s / 2.5) }
}

/** Tire `count` recettes au hasard, en favorisant celles qu'on a aimées, de saison et pas faites depuis longtemps. */
export function pickIdeas(
  recipes: Recipe[],
  which: IdeaKind,
  seed: number,
  count = 5,
  exclude: string[] = [],
  now = new Date(),
): Recipe[] {
  const rand = rng(seed)
  const all = recipes.filter((r) => inPool(r, which) && !exclude.includes(r.id)).map((r) => score(r, now))
  const first = all.filter((x) => !x.hard)
  const pool = first.length >= count ? first : [...first, ...all.filter((x) => x.hard)]
  const picked: Recipe[] = []
  const left = pool.slice()
  while (picked.length < count && left.length) {
    const total = left.reduce((acc, x) => acc + x.weight, 0)
    let t = rand() * total
    let idx = 0
    for (; idx < left.length - 1; idx++) {
      t -= left[idx].weight
      if (t <= 0) break
    }
    picked.push(left[idx].recipe)
    left.splice(idx, 1)
  }
  return picked
}

export interface FridgeHit {
  recipe: Recipe
  hits: string[]
}

/** Recettes qui utilisent ce qu'on a sous la main (« poulet, courgette »), les plus complètes d'abord. */
export function fridgeSearch(recipes: Recipe[], text: string): FridgeHit[] {
  const tokens = [
    ...new Set(
      text
        .split(/[,;\n]|\s+et\s+|\s+/)
        .map((t) => norm(t).replace(/s$/, ''))
        .filter((t) => t.length >= 3),
    ),
  ]
  if (!tokens.length) return []
  const out: FridgeHit[] = []
  for (const r of recipes) {
    if (r.toTry) continue
    const hay = searchText(r)
    const hits = tokens.filter((t) => hay.includes(t))
    if (hits.length) out.push({ recipe: r, hits })
  }
  return out.sort((a, b) => b.hits.length - a.hits.length || b.recipe.rating - a.recipe.rating)
}
