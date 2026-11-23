import { useState, type ReactElement } from 'react'
import { AddSheet } from './components/AddSheet'
import { EditSheet } from './components/EditSheet'
import { IconBook, IconBookmark, IconChart, IconGear, IconIdeas, IconPlus } from './components/Icons'
import { Login } from './components/Login'
import { LogSheet } from './components/LogSheet'
import { RecipeSheet } from './components/RecipeSheet'
import { SettingsSheet } from './components/SettingsSheet'
import { TimerDock } from './components/TimerDock'
import { Ideas } from './pages/Ideas'
import { Library } from './pages/Library'
import { StatsPage } from './pages/StatsPage'
import { SettingsProvider } from './settings'
import { StoreProvider, useStore } from './store'
import { UiProvider, useUi, type Overlay } from './ui'

type Tab = 'ideas' | 'all' | 'try' | 'stats'

const TABS: { id: Tab; label: string; icon: ReactElement }[] = [
  { id: 'ideas', label: 'Idées', icon: <IconIdeas /> },
  { id: 'all', label: 'Recettes', icon: <IconBook /> },
  { id: 'try', label: 'À tester', icon: <IconBookmark /> },
  { id: 'stats', label: 'Stats', icon: <IconChart /> },
]

function renderOverlay(o: Overlay, i: number) {
  switch (o.t) {
    case 'detail':
      return <RecipeSheet key={`${i}-${o.id}`} id={o.id} />
    case 'edit':
      return <EditSheet key={`${i}-${o.id ?? 'new'}`} id={o.id} draft={o.draft} queue={o.queue} />
    case 'add':
      return <AddSheet key={i} />
    case 'log':
      return <LogSheet key={`${i}-${o.id}`} id={o.id} />
    case 'settings':
      return <SettingsSheet key={i} />
  }
}

function Shell() {
  const store = useStore()
  const ui = useUi()
  const [tab, setTab] = useState<Tab>('ideas')

  if (store.auth === 'loading') {
    return (
      <main className="login">
        <h1 className="brand-big">Nos recettes</h1>
        <p className="muted">Ouverture du carnet…</p>
      </main>
    )
  }
  if (store.auth !== 'ready') return <Login />

  const covered = ui.stack.length > 0

  return (
    <div className="app">
      <div className="app-main" inert={covered}>
        <header className="topbar">
          <span className="brand">Nos recettes</span>
          {store.mode === 'demo' ? <span className="demo-badge">Démo</span> : null}
          <button type="button" className="icon-btn" aria-label="Réglages" onClick={() => ui.open({ t: 'settings' })}>
            <IconGear />
          </button>
        </header>
        {store.error ? <p className="banner">{store.error}</p> : null}
        <div hidden={tab !== 'ideas'}>
          <Ideas />
        </div>
        <div hidden={tab !== 'all'}>
          <Library scope="all" />
        </div>
        <div hidden={tab !== 'try'}>
          <Library scope="try" />
        </div>
        <div hidden={tab !== 'stats'}>
          <StatsPage />
        </div>

        {tab !== 'stats' ? (
          <button type="button" className="fab" aria-label="Ajouter des recettes" onClick={() => ui.open({ t: 'add' })}>
            <IconPlus />
          </button>
        ) : null}

        <nav className="tabbar" aria-label="Sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className="tab"
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => {
                setTab(t.id)
                window.scrollTo({ top: 0 })
              }}
            >
              <span className="tab-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {ui.stack.map((o, i) => (
        <div key={i} inert={i < ui.stack.length - 1}>
          {renderOverlay(o, i)}
        </div>
      ))}

      <TimerDock />
      {ui.toastMsg ? (
        <div className="toast" role="status">
          {ui.toastMsg}
        </div>
      ) : null}
    </div>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      <StoreProvider>
        <UiProvider>
          <Shell />
        </UiProvider>
      </StoreProvider>
    </SettingsProvider>
  )
}
