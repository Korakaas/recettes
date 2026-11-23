import { classifyNames } from './ai'
import type { Settings } from './settings'
import type { Store } from './store'
import type { Recipe, RecipeDraft } from './types'

/** Ne remplit que les champs encore vides : ce que tu as saisi n'est jamais écrasé. */
export function fillMissing(r: Recipe, s: Partial<RecipeDraft>): Partial<Recipe> | null {
  const patch: Partial<Recipe> = {}
  if (!r.kind && s.kind) patch.kind = s.kind
  if (!r.veg && s.veg) patch.veg = s.veg
  if (!r.time && s.time) patch.time = s.time
  if (!r.seasons.length && s.seasons?.length) patch.seasons = s.seasons
  if (!r.cuisine && s.cuisine) patch.cuisine = s.cuisine
  if (!r.main && s.main) patch.main = s.main
  if (!r.budget && s.budget) patch.budget = s.budget
  if (!r.difficulty && s.difficulty) patch.difficulty = s.difficulty
  if (!r.tags.length && s.tags?.length) patch.tags = s.tags
  if (!Object.keys(patch).length) return null
  patch.auto = true
  return patch
}

/**
 * Demande à Claude de classer ces recettes, 30 par 30, et enregistre chaque lot dès qu'il arrive.
 * Renvoie le nombre de recettes mises à jour.
 */
export async function classifyRecipes(
  settings: Settings,
  store: Pick<Store, 'patchMany'>,
  recipes: Recipe[],
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  const STEP = 30
  let updated = 0
  for (let i = 0; i < recipes.length; i += STEP) {
    const part = recipes.slice(i, i + STEP)
    const results = await classifyNames(
      settings,
      part.map((r) => r.name),
    )
    const patches: { id: string; patch: Partial<Recipe> }[] = []
    part.forEach((r, k) => {
      const res = results[k]
      const patch = res ? fillMissing(r, res) : null
      if (patch) patches.push({ id: r.id, patch })
    })
    if (patches.length) await store.patchMany(patches)
    updated += patches.length
    onProgress?.(Math.min(i + STEP, recipes.length), recipes.length)
  }
  return updated
}
