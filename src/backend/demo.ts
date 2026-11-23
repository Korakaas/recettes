import { normalizeRecipe, type Recipe } from '../types'
import { DEMO_RECIPES } from './demoData'
import type { Backend, RecipeData } from './types'

/**
 * Mode démo (adresse ?demo) : tout reste dans ce navigateur, rien n'est envoyé ni lu ailleurs.
 * Sert à essayer l'appli sans compte et à la tester.
 */
const KEY = 'recettes-demo'

function load(): Map<string, RecipeData> {
  const map = new Map<string, RecipeData>()
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const obj = JSON.parse(raw) as Record<string, RecipeData>
      for (const [id, data] of Object.entries(obj)) map.set(id, data)
      return map
    }
  } catch {
    /* stockage indisponible : on repart des exemples */
  }
  for (const r of DEMO_RECIPES) {
    const { id, ...rest } = r
    map.set(id, rest)
  }
  return map
}

export function createDemoBackend(): Backend {
  const store = load()
  const listeners = new Set<() => void>()
  let counter = 0

  const persist = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(store)))
    } catch {
      /* ignoré */
    }
  }
  const emit = () => {
    persist()
    listeners.forEach((l) => l())
  }
  const snapshot = (): Recipe[] =>
    [...store.entries()].map(([id, data]) => normalizeRecipe(id, data as unknown as Record<string, unknown>))

  return {
    mode: 'demo',
    onAuth(cb) {
      const t = window.setTimeout(() => cb({ email: 'demo@local' }), 0)
      return () => window.clearTimeout(t)
    },
    async signIn() {},
    async signOut() {},
    subscribe(cb) {
      const run = () => cb(snapshot())
      listeners.add(run)
      window.setTimeout(run, 0)
      return () => listeners.delete(run)
    },
    newId() {
      counter += 1
      return `demo-${Date.now().toString(36)}-${counter}`
    },
    async set(id, data) {
      store.set(id, data)
      emit()
    },
    async merge(id, patch) {
      const cur = store.get(id)
      if (!cur) throw new Error('Recette introuvable')
      store.set(id, { ...cur, ...patch })
      emit()
    },
    async remove(id) {
      store.delete(id)
      emit()
    },
    async batchSet(items) {
      for (const it of items) store.set(it.id, it.data)
      emit()
    },
    async batchMerge(items) {
      for (const it of items) {
        const cur = store.get(it.id)
        if (cur) store.set(it.id, { ...cur, ...it.patch })
      }
      emit()
    },
  }
}
