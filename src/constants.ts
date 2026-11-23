import type { Kind, Level, Season, TimeBucket, Veg } from './types'

export const KINDS: { id: Kind; label: string }[] = [
  { id: 'entree', label: 'Entrée' },
  { id: 'plat', label: 'Plat' },
  { id: 'accompagnement', label: 'Accompagnement' },
  { id: 'dessert', label: 'Dessert' },
  { id: 'gateau', label: 'Gâteau, goûter' },
  { id: 'pain', label: 'Pain, viennoiserie' },
  { id: 'apero', label: 'Apéro' },
]

export const SEASONS: { id: Season; label: string }[] = [
  { id: 'printemps', label: 'Printemps' },
  { id: 'ete', label: 'Été' },
  { id: 'automne', label: 'Automne' },
  { id: 'hiver', label: 'Hiver' },
  { id: 'toute', label: 'Toute l’année' },
]

export const TIMES: { id: TimeBucket; label: string; hint: string }[] = [
  { id: 'rapide', label: 'Rapide', hint: 'moins de 30 min' },
  { id: 'moyen', label: 'Moyen', hint: '30 min à 1 h' },
  { id: 'long', label: 'Long', hint: 'plus d’1 h' },
]

export const VEGS: { id: Veg; label: string }[] = [
  { id: 'oui', label: 'Végétarien' },
  { id: 'non', label: 'Avec viande ou poisson' },
]

export const BUDGETS: { id: Level; label: string }[] = [
  { id: 1, label: '€' },
  { id: 2, label: '€€' },
  { id: 3, label: '€€€' },
]

export const DIFFICULTIES: { id: Level; label: string }[] = [
  { id: 1, label: 'Facile' },
  { id: 2, label: 'Moyen' },
  { id: 3, label: 'Technique' },
]

export type Family = 'sale' | 'sucre' | 'pain'

export const FAMILIES: { id: Family; label: string }[] = [
  { id: 'sale', label: 'Salé' },
  { id: 'sucre', label: 'Sucré' },
  { id: 'pain', label: 'Pain' },
]

/** Salé, sucré ou pain : déduit du type de plat, jamais saisi à la main. */
export function familyOf(kind: Kind | ''): Family | '' {
  if (!kind) return ''
  if (kind === 'dessert' || kind === 'gateau') return 'sucre'
  if (kind === 'pain') return 'pain'
  return 'sale'
}

export function labelOf<T extends string | number>(
  list: { id: T; label: string }[],
  id: T | '',
): string {
  return list.find((x) => x.id === id)?.label ?? ''
}

/** Modèles par défaut, les mêmes que ceux de nikki-app. */
export const DEFAULT_MODEL = 'claude-sonnet-5-5'
export const DEFAULT_LIGHT_MODEL = 'claude-haiku-5-5'
