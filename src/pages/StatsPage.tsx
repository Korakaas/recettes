import { useMemo } from 'react'
import { computeStats, type Bar } from '../stats'
import { useStore } from '../store'
import { useUi } from '../ui'
import { ago, lastMade } from '../util'

function Bars({ data, emptyText }: { data: Bar[]; emptyText: string }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  if (!data.length) return <p className="muted">{emptyText}</p>
  return (
    <ul className="bars">
      {data.map((d) => (
        <li key={d.label}>
          <span className="bar-label">{d.label}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${(d.count / max) * 100}%` }} />
          </span>
          <span className="bar-num">{d.count}</span>
        </li>
      ))}
    </ul>
  )
}

export function StatsPage() {
  const { recipes, loaded } = useStore()
  const ui = useUi()
  const s = useMemo(() => computeStats(recipes), [recipes])
  const maxMonth = Math.max(1, ...s.monthly.map((m) => m.count))

  if (!loaded) {
    return (
      <div className="page">
        <h1 className="page-title">Stats</h1>
        <p className="muted pad">Chargement…</p>
      </div>
    )
  }

  return (
    <div className="page">
      <h1 className="page-title">Stats</h1>

      <div className="kpis">
        <div className="kpi">
          <strong>{s.total}</strong>
          <span>recettes</span>
        </div>
        <div className="kpi">
          <strong>{s.logsThisMonth}</strong>
          <span>faites ce mois-ci</span>
        </div>
        <div className="kpi">
          <strong>{s.logsThisYear}</strong>
          <span>cette année</span>
        </div>
        <div className="kpi">
          <strong>{s.toTry}</strong>
          <span>à tester</span>
        </div>
      </div>

      {s.logsTotal === 0 ? (
        <p className="notice plain">
          Le journal est vide : chaque fois que vous faites une recette, touche « Je l’ai faite » sur sa fiche. Les
          classements « les plus faites » se remplissent ainsi.
        </p>
      ) : null}

      <section className="block">
        <h2 className="block-title">Les plus faites</h2>
        {s.top.length ? (
          <ol className="rank">
            {s.top.map(({ recipe, count }) => (
              <li key={recipe.id}>
                <button type="button" className="link-row" onClick={() => ui.open({ t: 'detail', id: recipe.id })}>
                  <span>{recipe.name}</span>
                  <span className="muted">
                    {count} fois · {ago(lastMade(recipe))}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">Pas encore de recette faite.</p>
        )}
      </section>

      <section className="block">
        <h2 className="block-title">À ressortir</h2>
        <p className="muted">Notées 4 et plus, pas faites depuis plus de 3 mois (ou pas encore au journal).</p>
        {s.forgotten.length ? (
          <ul className="rank plain">
            {s.forgotten.map((r) => (
              <li key={r.id}>
                <button type="button" className="link-row" onClick={() => ui.open({ t: 'detail', id: r.id })}>
                  <span>{r.name}</span>
                  <span className="muted">{lastMade(r) ? ago(lastMade(r)) : 'jamais au journal'}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Rien à ressortir pour l’instant.</p>
        )}
      </section>

      <section className="block">
        <h2 className="block-title">Les mieux notées</h2>
        {s.best.length ? (
          <ul className="rank plain">
            {s.best.map((r) => (
              <li key={r.id}>
                <button type="button" className="link-row" onClick={() => ui.open({ t: 'detail', id: r.id })}>
                  <span>{r.name}</span>
                  <span className="card-stars">★ {r.rating}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Aucune recette notée 4 ou 5.</p>
        )}
      </section>

      <section className="block">
        <h2 className="block-title">Faites mois par mois</h2>
        <div className="months" role="img" aria-label={`Recettes faites sur les 12 derniers mois : ${s.monthly.map((m) => `${m.label} ${m.count}`).join(', ')}`}>
          {s.monthly.map((m, i) => (
            <div key={i} className="month">
              <span className="month-num">{m.count || ''}</span>
              <span className="month-bar" style={{ height: `${(m.count / maxMonth) * 100}%` }} />
              <span className="month-label">{m.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="block">
        <h2 className="block-title">Répartition</h2>
        <h3 className="mini-title">Salé, sucré, pain</h3>
        <Bars data={s.byFamily} emptyText="Pas encore classées." />
        <h3 className="mini-title">Par type</h3>
        <Bars data={s.byKind} emptyText="Pas encore classées." />
        <h3 className="mini-title">Par saison</h3>
        <Bars data={s.bySeason} emptyText="Pas encore classées." />
        <h3 className="mini-title">Cuisines</h3>
        <Bars data={s.byCuisine} emptyText="Aucune cuisine renseignée." />
      </section>
    </div>
  )
}
