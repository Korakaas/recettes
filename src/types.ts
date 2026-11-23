export type Season = 'printemps' | 'ete' | 'automne' | 'hiver' | 'toute'
export type Kind = 'entree' | 'plat' | 'accompagnement' | 'dessert' | 'gateau' | 'pain' | 'apero'
export type TimeBucket = 'rapide' | 'moyen' | 'long'
export type Veg = 'oui' | 'non'
export type Level = 0 | 1 | 2 | 3

/** Une fois où la recette a été faite. */
export interface LogEntry {
  /** YYYY-MM-DD, date locale. */
  date: string
  /** Note de 1 à 5 donnée ce jour-là. */
  rating?: number
  comment?: string
}

export interface Recipe {
  id: string
  name: string
  kind: Kind | ''
  veg: Veg | ''
  time: TimeBucket | ''
  seasons: Season[]
  cuisine: string
  /** Ingrédient principal. */
  main: string
  /** 0 = non renseigné, 1 = économique, 2 = normal, 3 = festif. */
  budget: Level
  /** 0 = non renseignée, 1 = facile, 2 = moyen, 3 = technique. */
  difficulty: Level
  tags: string[]
  /** Note d'ensemble de 0 (pas notée) à 5. */
  rating: number
  /** Dans la liste « à tester » (pas encore faite). */
  toTry: boolean
  /** Classement proposé par Claude, pas encore relu. */
  auto: boolean
  /** Nombre de personnes pour lesquelles les quantités sont écrites. */
  servings: number
  /** Une ligne par ingrédient. */
  ingredients: string
  /** Une ligne par étape. */
  steps: string
  notes: string
  source: string
  journal: LogEntry[]
  createdAt: number
  updatedAt: number
}

export type RecipeDraft = Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>

export const DEFAULT_SERVINGS = 4

export function emptyDraft(): RecipeDraft {
  return {
    name: '',
    kind: '',
    veg: '',
    time: '',
    seasons: [],
    cuisine: '',
    main: '',
    budget: 0,
    difficulty: 0,
    tags: [],
    rating: 0,
    toTry: false,
    auto: false,
    servings: DEFAULT_SERVINGS,
    ingredients: '',
    steps: '',
    notes: '',
    source: '',
    journal: [],
  }
}

const KINDS: string[] = ['entree', 'plat', 'accompagnement', 'dessert', 'gateau', 'pain', 'apero']
const SEASONS: string[] = ['printemps', 'ete', 'automne', 'hiver', 'toute']
const TIMES: string[] = ['rapide', 'moyen', 'long']

function level(v: unknown): Level {
  const n = Math.round(Number(v))
  return n === 1 || n === 2 || n === 3 ? n : 0
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

/** Reconstruit une recette complète à partir d'un document lu (champs absents ou invalides tolérés). */
export function normalizeRecipe(id: string, raw: Record<string, unknown>): Recipe {
  const base = emptyDraft()
  const seasons = Array.isArray(raw.seasons)
    ? (raw.seasons.filter((s) => SEASONS.includes(String(s))) as Season[])
    : []
  const journal: LogEntry[] = Array.isArray(raw.journal)
    ? raw.journal
        .map((e) => e as Record<string, unknown>)
        .filter((e) => e && typeof e.date === 'string')
        .map((e) => ({
          date: String(e.date),
          ...(Number(e.rating) > 0 ? { rating: Math.min(5, Math.round(Number(e.rating))) } : {}),
          ...(str(e.comment) ? { comment: str(e.comment) } : {}),
        }))
    : []
  const servings = Math.round(Number(raw.servings))
  return {
    ...base,
    id,
    name: str(raw.name).trim() || 'Sans nom',
    kind: KINDS.includes(String(raw.kind)) ? (raw.kind as Kind) : '',
    veg: raw.veg === 'oui' || raw.veg === 'non' ? raw.veg : '',
    time: TIMES.includes(String(raw.time)) ? (raw.time as TimeBucket) : '',
    seasons,
    cuisine: str(raw.cuisine).trim(),
    main: str(raw.main).trim(),
    budget: level(raw.budget),
    difficulty: level(raw.difficulty),
    tags: Array.isArray(raw.tags) ? raw.tags.map((t) => String(t).trim()).filter(Boolean) : [],
    rating: Math.min(5, Math.max(0, Math.round(Number(raw.rating) || 0))),
    toTry: raw.toTry === true,
    auto: raw.auto === true,
    servings: servings > 0 && servings < 100 ? servings : DEFAULT_SERVINGS,
    ingredients: str(raw.ingredients),
    steps: str(raw.steps),
    notes: str(raw.notes),
    source: str(raw.source),
    journal,
    createdAt: Number(raw.createdAt) || 0,
    updatedAt: Number(raw.updatedAt) || 0,
  }
}
