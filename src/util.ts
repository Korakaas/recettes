import type { Season } from './types'

/** Minuscules, sans accents ni espaces superflus : pour comparer et chercher. */
export function norm(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Date locale (pas UTC) au format YYYY-MM-DD. */
export function todayStr(date = new Date()): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

function parseDay(s: string): Date | null {
  const p = s.split('-').map(Number)
  if (p.length !== 3 || !p[0] || !p[1] || !p[2]) return null
  return new Date(p[0], p[1] - 1, p[2])
}

/** Nombre de jours entre une date YYYY-MM-DD et aujourd'hui (null si illisible). */
export function daysSince(s: string, now = new Date()): number | null {
  const d = parseDay(s)
  if (!d) return null
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((t.getTime() - d.getTime()) / 86_400_000)
}

export function ago(s: string, now = new Date()): string {
  const n = daysSince(s, now)
  if (n == null) return ''
  if (n <= 0) return 'aujourd’hui'
  if (n === 1) return 'hier'
  if (n < 14) return `il y a ${n} jours`
  if (n < 60) return `il y a ${Math.round(n / 7)} semaines`
  if (n < 365) return `il y a ${Math.round(n / 30)} mois`
  const y = Math.round(n / 365)
  return `il y a ${y} ${y > 1 ? 'ans' : 'an'}`
}

export function formatDay(s: string): string {
  const d = parseDay(s)
  if (!d) return s
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function currentSeason(now = new Date()): Exclude<Season, 'toute'> {
  const m = now.getMonth()
  if (m >= 2 && m <= 4) return 'printemps'
  if (m >= 5 && m <= 7) return 'ete'
  if (m >= 8 && m <= 10) return 'automne'
  return 'hiver'
}

/** Générateur pseudo-aléatoire reproductible (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function byName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name, 'fr')
}

export function uniqueSorted(values: string[]): string[] {
  const seen = new Map<string, string>()
  for (const v of values) {
    const t = v.trim()
    if (t && !seen.has(norm(t))) seen.set(norm(t), t)
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'fr'))
}

/** Dernière date où la recette a été faite (YYYY-MM-DD), ou '' si jamais notée. */
export function lastMade(r: { journal: { date: string }[] }): string {
  let best = ''
  for (const e of r.journal) if (e.date > best) best = e.date
  return best
}
