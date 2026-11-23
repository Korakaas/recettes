import { FAMILIES, KINDS, SEASONS, familyOf, labelOf } from './constants'
import type { Recipe } from './types'
import { daysSince, lastMade, norm } from './util'

export interface Counted {
  recipe: Recipe
  count: number
}

export interface Bar {
  label: string
  count: number
}

export interface Stats {
  total: number
  toTry: number
  logsTotal: number
  logsThisMonth: number
  logsThisYear: number
  top: Counted[]
  best: Recipe[]
  forgotten: Recipe[]
  byKind: Bar[]
  byFamily: Bar[]
  bySeason: Bar[]
  byCuisine: Bar[]
  monthly: Bar[]
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function computeStats(all: Recipe[], now = new Date()): Stats {
  const recipes = all.filter((r) => !r.toTry)
  const thisMonth = monthKey(now)
  const thisYear = String(now.getFullYear())

  let logsTotal = 0
  let logsThisMonth = 0
  let logsThisYear = 0
  const monthCounts = new Map<string, number>()
  for (const r of recipes) {
    for (const e of r.journal) {
      logsTotal += 1
      if (e.date.startsWith(thisYear)) logsThisYear += 1
      if (e.date.startsWith(thisMonth)) logsThisMonth += 1
      const k = e.date.slice(0, 7)
      monthCounts.set(k, (monthCounts.get(k) ?? 0) + 1)
    }
  }

  const top = recipes
    .filter((r) => r.journal.length > 0)
    .map((r) => ({ recipe: r, count: r.journal.length }))
    .sort((a, b) => b.count - a.count || b.recipe.rating - a.recipe.rating)
    .slice(0, 10)

  const best = recipes
    .filter((r) => r.rating >= 4)
    .sort((a, b) => b.rating - a.rating || b.journal.length - a.journal.length)
    .slice(0, 10)

  // Les recettes aimées qu'on n'a pas faites depuis longtemps, ou jamais notées comme faites.
  const forgotten = recipes
    .filter((r) => {
      if (r.rating < 4) return false
      const last = lastMade(r)
      return !last || (daysSince(last, now) ?? 0) > 90
    })
    .sort((a, b) => {
      const p = lastMade(a) || '0000'
      const q = lastMade(b) || '0000'
      return p < q ? -1 : p > q ? 1 : b.rating - a.rating
    })
    .slice(0, 8)

  const countBy = (key: (r: Recipe) => string[]): Map<string, number> => {
    const m = new Map<string, number>()
    for (const r of recipes) for (const k of key(r)) if (k) m.set(k, (m.get(k) ?? 0) + 1)
    return m
  }

  const byKind = KINDS.map((k) => ({ label: k.label, count: recipes.filter((r) => r.kind === k.id).length })).filter(
    (b) => b.count,
  )
  const byFamily = FAMILIES.map((f) => ({
    label: f.label,
    count: recipes.filter((r) => familyOf(r.kind) === f.id).length,
  })).filter((b) => b.count)
  const bySeason = SEASONS.map((s) => ({
    label: s.label,
    count: recipes.filter((r) => r.seasons.includes(s.id)).length,
  })).filter((b) => b.count)

  const cuisineNames = new Map<string, string>()
  for (const r of recipes) if (r.cuisine && !cuisineNames.has(norm(r.cuisine))) cuisineNames.set(norm(r.cuisine), r.cuisine)
  const byCuisine = [...countBy((r) => [norm(r.cuisine)]).entries()]
    .map(([k, count]) => ({ label: cuisineNames.get(k) ?? k, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  const monthly: Bar[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthly.push({
      label: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
      count: monthCounts.get(monthKey(d)) ?? 0,
    })
  }

  return {
    total: recipes.length,
    toTry: all.length - recipes.length,
    logsTotal,
    logsThisMonth,
    logsThisYear,
    top,
    best,
    forgotten,
    byKind,
    byFamily,
    bySeason,
    byCuisine,
    monthly,
  }
}

export { labelOf }
