import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_LIGHT_MODEL, DEFAULT_MODEL } from './constants'
import { DEFAULT_SERVINGS } from './types'

export type Theme = 'auto' | 'light' | 'dark'

/** Réglages propres à cet appareil (la clé API ne quitte jamais le téléphone). */
export interface Settings {
  apiKey: string
  model: string
  lightModel: string
  theme: Theme
  servings: number
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  model: DEFAULT_MODEL,
  lightModel: DEFAULT_LIGHT_MODEL,
  theme: 'auto',
  servings: DEFAULT_SERVINGS,
}

const KEY = 'recettes-settings'
const THEME_KEY = 'recettes-theme'

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const o = JSON.parse(raw) as Partial<Settings>
      return {
        apiKey: typeof o.apiKey === 'string' ? o.apiKey.trim() : '',
        model: o.model?.trim() || DEFAULT_SETTINGS.model,
        lightModel: o.lightModel?.trim() || DEFAULT_SETTINGS.lightModel,
        theme: o.theme === 'light' || o.theme === 'dark' ? o.theme : 'auto',
        servings: o.servings && o.servings > 0 ? Math.round(o.servings) : DEFAULT_SETTINGS.servings,
      }
    }
  } catch {
    /* stockage indisponible */
  }
  return DEFAULT_SETTINGS
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'auto') delete root.dataset.theme
  else root.dataset.theme = theme
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* ignoré */
  }
}

interface Ctx {
  settings: Settings
  update(patch: Partial<Settings>): void
}

const SettingsContext = createContext<Ctx | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load)

  useEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme])

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((cur) => {
      const next = { ...cur, ...patch }
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        /* ignoré */
      }
      return next
    })
  }, [])

  const value = useMemo(() => ({ settings, update }), [settings, update])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('SettingsProvider manquant')
  return ctx
}

/**
 * Lit la clé API enregistrée par nikki-app. Les deux applis sont sur la même adresse
 * (korakaas.github.io), donc elles partagent le même stockage. On ne crée jamais la base
 * « nikki » si elle n'existe pas, pour ne pas gêner nikki-app.
 */
export async function readNikkiKey(): Promise<{ key: string } | { error: string }> {
  try {
    if (!('indexedDB' in window) || typeof indexedDB.databases !== 'function') {
      return { error: 'Ce navigateur ne permet pas de la reprendre. Colle-la à la main.' }
    }
    const dbs = await indexedDB.databases()
    if (!dbs.some((d) => d.name === 'nikki')) {
      return {
        error:
          'Aucune clé trouvée ici. nikki-app doit être ouverte depuis la même adresse (korakaas.github.io). Colle la clé à la main.',
      }
    }
    return await new Promise((resolve) => {
      const req = indexedDB.open('nikki')
      req.onupgradeneeded = () => {
        // La base n'existait pas : on annule pour ne rien créer.
        req.transaction?.abort()
      }
      req.onerror = () => resolve({ error: 'Lecture impossible. Colle la clé à la main.' })
      req.onsuccess = () => {
        const db = req.result
        try {
          if (!db.objectStoreNames.contains('settings')) {
            db.close()
            resolve({ error: 'Aucune clé trouvée dans nikki-app.' })
            return
          }
          const get = db.transaction('settings', 'readonly').objectStore('settings').get('app')
          get.onsuccess = () => {
            const value = get.result as { apiKey?: string } | undefined
            db.close()
            const key = value?.apiKey?.trim()
            resolve(key ? { key } : { error: 'nikki-app n’a pas de clé enregistrée.' })
          }
          get.onerror = () => {
            db.close()
            resolve({ error: 'Lecture impossible. Colle la clé à la main.' })
          }
        } catch {
          db.close()
          resolve({ error: 'Lecture impossible. Colle la clé à la main.' })
        }
      }
    })
  } catch {
    return { error: 'Lecture impossible. Colle la clé à la main.' }
  }
}
