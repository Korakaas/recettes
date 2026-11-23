import { useState } from 'react'
import { recipesToCsv, downloadText } from '../csv'
import { readNikkiKey, useSettings, type Theme } from '../settings'
import { useStore } from '../store'
import { useUi } from '../ui'
import { todayStr } from '../util'
import { Field } from './Bits'
import { Sheet } from './Sheet'

const THEMES: { id: Theme; label: string }[] = [
  { id: 'auto', label: 'Comme le téléphone' },
  { id: 'light', label: 'Clair' },
  { id: 'dark', label: 'Sombre' },
]

export function SettingsSheet() {
  const { settings, update } = useSettings()
  const store = useStore()
  const ui = useUi()
  const [show, setShow] = useState(false)
  const [note, setNote] = useState('')

  async function takeNikkiKey() {
    const res = await readNikkiKey()
    if ('key' in res) {
      update({ apiKey: res.key })
      setNote('Clé reprise depuis nikki-app.')
    } else {
      setNote(res.error)
    }
  }

  function exportCsv() {
    downloadText(`recettes-export-${todayStr()}.csv`, recipesToCsv(store.recipes))
    ui.toast('Fichier téléchargé. Ouvre-le avec Google Sheets (Fichier, Importer).')
  }

  return (
    <Sheet title="Réglages">
      <section className="block">
        <h3 className="block-title">Claude</h3>
        <p className="muted">
          Sert à lire un lien, un texte ou une photo, et à classer les recettes. La clé reste sur cet appareil : elle n’est
          jamais envoyée ailleurs qu’à Claude, ni enregistrée dans la base.
        </p>
        <Field label="Clé API" htmlFor="s-key">
          <div className="row">
            <input
              id="s-key"
              className="input"
              type={show ? 'text' : 'password'}
              value={settings.apiKey}
              placeholder="sk-ant-…"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              onChange={(e) => update({ apiKey: e.target.value.trim() })}
            />
            <button type="button" className="btn ghost small" onClick={() => setShow((s) => !s)}>
              {show ? 'Masquer' : 'Afficher'}
            </button>
          </div>
        </Field>
        <div className="row">
          <button type="button" className="btn ghost small" onClick={takeNikkiKey}>
            Reprendre la clé de nikki-app
          </button>
        </div>
        {note ? <p className="hint">{note}</p> : null}
        <div className="two-col">
          <Field label="Modèle pour lire les liens et photos" htmlFor="s-model">
            <input id="s-model" className="input" value={settings.model} onChange={(e) => update({ model: e.target.value })} />
          </Field>
          <Field label="Modèle pour classer" htmlFor="s-light">
            <input
              id="s-light"
              className="input"
              value={settings.lightModel}
              onChange={(e) => update({ lightModel: e.target.value })}
            />
          </Field>
        </div>
      </section>

      <section className="block">
        <h3 className="block-title">Recettes</h3>
        <Field label="Nombre de personnes par défaut" htmlFor="s-serv" hint="Pour les nouvelles recettes. Vous êtes deux, avec des restes : 4.">
          <input
            id="s-serv"
            className="input short"
            type="number"
            min={1}
            max={30}
            inputMode="numeric"
            value={settings.servings}
            onChange={(e) => update({ servings: Math.max(1, Math.min(30, Math.round(Number(e.target.value)) || 1)) })}
          />
        </Field>
      </section>

      <section className="block">
        <h3 className="block-title">Apparence</h3>
        <div className="chips" role="group" aria-label="Thème">
          {THEMES.map((t) => (
            <button key={t.id} type="button" className="chip" aria-pressed={settings.theme === t.id} onClick={() => update({ theme: t.id })}>
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="block">
        <h3 className="block-title">Sauvegarde</h3>
        <p className="muted">
          Un fichier CSV avec toutes les recettes, le journal compris, à ouvrir dans Google Sheets.
        </p>
        <div className="row">
          <button type="button" className="btn ghost" onClick={exportCsv} disabled={!store.recipes.length}>
            Exporter en CSV
          </button>
        </div>
      </section>

      <section className="block">
        <h3 className="block-title">Compte</h3>
        <p className="muted">
          {store.mode === 'demo' ? 'Mode démo : les recettes restent dans ce navigateur.' : `Connectée en tant que ${store.email}.`}
        </p>
        {store.mode === 'firebase' ? (
          <div className="row">
            <button
              type="button"
              className="btn ghost"
              onClick={async () => {
                await store.signOut()
                ui.close(ui.stack.length)
              }}
            >
              Se déconnecter
            </button>
          </div>
        ) : null}
      </section>
    </Sheet>
  )
}
