import { useState } from 'react'
import { useStore } from '../store'

export function Login() {
  const store = useStore()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const denied = store.auth === 'denied'

  async function signIn() {
    setBusy(true)
    setError('')
    const msg = await store.signIn()
    setBusy(false)
    if (msg) setError(msg)
  }

  return (
    <main className="login">
      <h1 className="brand-big">Nos recettes</h1>
      {denied ? (
        <>
          <p>
            Le compte <strong>{store.email}</strong> n’a pas accès à ce carnet.
          </p>
          <p className="muted">
            Connecte-toi avec l’une des deux adresses Google autorisées, ou ajoute celle-ci dans les règles Firestore.
          </p>
          <button type="button" className="btn" onClick={() => void store.signOut()}>
            Changer de compte
          </button>
        </>
      ) : (
        <>
          <p>Le carnet de recettes à deux : retrouver ce qu’on a aimé, et savoir quoi manger cette semaine.</p>
          <button type="button" className="btn" disabled={busy} onClick={signIn}>
            {busy ? 'Connexion…' : 'Se connecter avec Google'}
          </button>
          {error ? <p className="error">{error}</p> : null}
          <p className="muted small-print">
            Seules les deux adresses Google de la maison peuvent ouvrir le carnet.{' '}
            <a href="?demo">Essayer le mode démo</a>
          </p>
        </>
      )}
    </main>
  )
}
