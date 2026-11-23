import type { Recipe } from '../types'

export interface AuthUser {
  email: string
}

export interface BackendError {
  code?: string
  message: string
}

export type RecipeData = Omit<Recipe, 'id'>

/** Ce dont l'appli a besoin pour lire et écrire les recettes : Firebase en vrai, mémoire locale en démo. */
export interface Backend {
  mode: 'firebase' | 'demo'
  onAuth(cb: (user: AuthUser | null) => void): () => void
  signIn(): Promise<void>
  signOut(): Promise<void>
  subscribe(cb: (recipes: Recipe[]) => void, onError: (e: BackendError) => void): () => void
  newId(): string
  set(id: string, data: RecipeData): Promise<void>
  merge(id: string, patch: Partial<RecipeData>): Promise<void>
  remove(id: string): Promise<void>
  batchSet(items: { id: string; data: RecipeData }[]): Promise<void>
  batchMerge(items: { id: string; patch: Partial<RecipeData> }[]): Promise<void>
}
