import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createDemoBackend } from './backend/demo'
import { createFirebaseBackend } from './backend/firebase'
import type { Backend, RecipeData } from './backend/types'
import { emptyDraft, type LogEntry, type Recipe, type RecipeDraft } from './types'

export type AuthState = 'loading' | 'signedOut' | 'denied' | 'ready'

export interface Store {
  mode: 'firebase' | 'demo'
  auth: AuthState
  email: string
  recipes: Recipe[]
  loaded: boolean
  error: string
  signIn(): Promise<string>
  signOut(): Promise<void>
  create(draft: Partial<RecipeDraft> & { name: string }): Promise<string>
  save(recipe: Recipe): Promise<void>
  patch(id: string, patch: Partial<RecipeData>): Promise<void>
  remove(id: string): Promise<void>
  addMany(drafts: (Partial<RecipeDraft> & { name: string })[]): Promise<string[]>
  patchMany(items: { id: string; patch: Partial<RecipeData> }[]): Promise<void>
  logMade(id: string, entry: LogEntry): Promise<void>
  removeLog(id: string, index: number): Promise<void>
}

const StoreContext = createContext<Store | null>(null)

let backendSingleton: Backend | null = null

function getBackend(): Backend {
  if (!backendSingleton) {
    const demo = new URLSearchParams(window.location.search).has('demo')
    backendSingleton = demo ? createDemoBackend() : createFirebaseBackend()
  }
  return backendSingleton
}

function signInMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? ''
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return ''
  if (code === 'auth/popup-blocked') return 'Le navigateur a bloqué la fenêtre de connexion. Autorise-la et réessaie.'
  if (code === 'auth/unauthorized-domain') {
    return 'Cette adresse n’est pas autorisée dans Firebase (Authentication, Settings, Authorized domains).'
  }
  if (code === 'auth/network-request-failed') return 'Pas de connexion. Réessaie quand le réseau est revenu.'
  return 'La connexion a échoué. Réessaie.'
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const backend = getBackend()
  const [auth, setAuth] = useState<AuthState>('loading')
  const [email, setEmail] = useState('')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<Recipe[]>([])
  ref.current = recipes

  useEffect(() => {
    let unsub: (() => void) | null = null
    const off = backend.onAuth((user) => {
      unsub?.()
      unsub = null
      if (!user) {
        setEmail('')
        setRecipes([])
        setLoaded(false)
        setAuth('signedOut')
        return
      }
      setEmail(user.email)
      setAuth('ready')
      setError('')
      unsub = backend.subscribe(
        (list) => {
          setRecipes(list)
          setLoaded(true)
          setError('')
        },
        (e) => {
          if (e.code === 'permission-denied') setAuth('denied')
          else setError('Impossible de lire les recettes pour le moment.')
        },
      )
    })
    return () => {
      off()
      unsub?.()
    }
  }, [backend])

  const signIn = useCallback(async () => {
    try {
      await backend.signIn()
      return ''
    } catch (e) {
      return signInMessage(e)
    }
  }, [backend])

  const signOut = useCallback(() => backend.signOut(), [backend])

  const create = useCallback(
    async (draft: Partial<RecipeDraft> & { name: string }) => {
      const id = backend.newId()
      const now = Date.now()
      await backend.set(id, { ...emptyDraft(), ...draft, createdAt: now, updatedAt: now })
      return id
    },
    [backend],
  )

  const save = useCallback(
    async (recipe: Recipe) => {
      const { id, ...data } = recipe
      await backend.set(id, { ...data, updatedAt: Date.now() })
    },
    [backend],
  )

  const patch = useCallback(
    (id: string, p: Partial<RecipeData>) => backend.merge(id, { ...p, updatedAt: Date.now() }),
    [backend],
  )

  const remove = useCallback((id: string) => backend.remove(id), [backend])

  const addMany = useCallback(
    async (drafts: (Partial<RecipeDraft> & { name: string })[]) => {
      const now = Date.now()
      const items = drafts.map((d, i) => ({
        id: backend.newId(),
        data: { ...emptyDraft(), ...d, createdAt: now + i, updatedAt: now } as RecipeData,
      }))
      await backend.batchSet(items)
      return items.map((it) => it.id)
    },
    [backend],
  )

  const patchMany = useCallback(
    async (items: { id: string; patch: Partial<RecipeData> }[]) => {
      const now = Date.now()
      await backend.batchMerge(items.map((it) => ({ id: it.id, patch: { ...it.patch, updatedAt: now } })))
    },
    [backend],
  )

  const logMade = useCallback(
    async (id: string, entry: LogEntry) => {
      const r = ref.current.find((x) => x.id === id)
      if (!r) return
      const journal = [...r.journal, entry].sort((a, b) => (a.date < b.date ? -1 : 1))
      await patch(id, { journal, rating: entry.rating ?? r.rating, toTry: false })
    },
    [patch],
  )

  const removeLog = useCallback(
    async (id: string, index: number) => {
      const r = ref.current.find((x) => x.id === id)
      if (!r) return
      await patch(id, { journal: r.journal.filter((_, i) => i !== index) })
    },
    [patch],
  )

  const value = useMemo<Store>(
    () => ({
      mode: backend.mode,
      auth,
      email,
      recipes,
      loaded,
      error,
      signIn,
      signOut,
      create,
      save,
      patch,
      remove,
      addMany,
      patchMany,
      logMade,
      removeLog,
    }),
    [backend, auth, email, recipes, loaded, error, signIn, signOut, create, save, patch, remove, addMany, patchMany, logMade, removeLog],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('StoreProvider manquant')
  return ctx
}
