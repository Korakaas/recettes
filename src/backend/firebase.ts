import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
} from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { normalizeRecipe } from '../types'
import type { Backend, RecipeData } from './types'

// Ces valeurs ne sont pas secrètes : l'accès aux données est protégé par les règles Firestore
// (voir firestore.rules), qui n'autorisent que les adresses Google de la maison.
const firebaseConfig = {
  apiKey: 'AIzaSyA6i12fsykFbVJHqGmveR05h_nHqQfbF2k',
  authDomain: 'recettes-e5e55.firebaseapp.com',
  projectId: 'recettes-e5e55',
  storageBucket: 'recettes-e5e55.firebasestorage.app',
  messagingSenderId: '918112183990',
  appId: '1:918112183990:web:2cfaa4ddc02b6756102817',
}

const COLLECTION = 'recipes'
const BATCH_SIZE = 400

function chunks<T>(items: T[]): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += BATCH_SIZE) out.push(items.slice(i, i + BATCH_SIZE))
  return out
}

export function createFirebaseBackend(): Backend {
  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  // Cache local persistant : l'appli s'ouvre et reste utilisable sans connexion,
  // les modifications se synchronisent au retour du réseau.
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    ignoreUndefinedProperties: true,
  })
  const col = collection(db, COLLECTION)

  return {
    mode: 'firebase',
    onAuth(cb) {
      return onAuthStateChanged(auth, (u) => cb(u?.email ? { email: u.email } : null))
    },
    async signIn() {
      await signInWithPopup(auth, new GoogleAuthProvider())
    },
    async signOut() {
      await fbSignOut(auth)
    },
    subscribe(cb, onError) {
      return onSnapshot(
        col,
        (snap) => {
          cb(snap.docs.map((d) => normalizeRecipe(d.id, d.data())))
        },
        (e) => onError({ code: e.code, message: e.message }),
      )
    },
    newId() {
      return doc(col).id
    },
    async set(id, data) {
      await setDoc(doc(col, id), data)
    },
    async merge(id, patch) {
      await updateDoc(doc(col, id), patch as Record<string, unknown>)
    },
    async remove(id) {
      await deleteDoc(doc(col, id))
    },
    async batchSet(items: { id: string; data: RecipeData }[]) {
      for (const part of chunks(items)) {
        const batch = writeBatch(db)
        for (const it of part) batch.set(doc(col, it.id), it.data)
        await batch.commit()
      }
    },
    async batchMerge(items) {
      for (const part of chunks(items)) {
        const batch = writeBatch(db)
        for (const it of part) batch.update(doc(col, it.id), it.patch as Record<string, unknown>)
        await batch.commit()
      }
    },
  }
}
