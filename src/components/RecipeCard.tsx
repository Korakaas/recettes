import { KINDS, SEASONS, TIMES, labelOf } from '../constants'
import type { Recipe } from '../types'
import { ago, lastMade } from '../util'
import { IconRefresh } from './Icons'

interface Props {
  recipe: Recipe
  onOpen(): void
  onSwap?(): void
}

/** Une fiche de la liste : on y lit d'un coup d'œil de quoi il s'agit et quand on l'a faite. */
export function RecipeCard({ recipe: r, onOpen, onSwap }: Props) {
  const last = lastMade(r)
  const meta = [labelOf(KINDS, r.kind), r.time ? labelOf(TIMES, r.time) : '', r.cuisine].filter(Boolean).join(' · ')
  const seasons = r.seasons.filter((s) => s !== 'toute')
  return (
    <article className="card">
      <button type="button" className="card-main" onClick={onOpen}>
        <span className="card-name">{r.name}</span>
        <span className={`card-meta${meta ? '' : ' faint'}`}>{meta || 'À classer'}</span>
        {r.veg === 'oui' || seasons.length || r.main || r.tags.length ? (
          <span className="tapes">
            {r.veg === 'oui' ? <span className="tape green">Végé</span> : null}
            {seasons.map((s) => (
              <span key={s} className={`tape ${s}`}>
                {labelOf(SEASONS, s)}
              </span>
            ))}
            {r.main ? <span className="tape">{r.main}</span> : null}
            {r.tags.slice(0, 2).map((t) => (
              <span key={t} className="tape">
                {t}
              </span>
            ))}
          </span>
        ) : null}
        <span className="card-foot">
          {r.rating > 0 ? <span className="card-stars">★ {r.rating}</span> : null}
          {r.toTry ? <span>À tester</span> : null}
          {last ? <span>Faite {ago(last)}</span> : null}
          {r.auto ? <span className="auto">Classement proposé</span> : null}
        </span>
      </button>
      {onSwap ? (
        <button type="button" className="swap" onClick={onSwap} aria-label={`Une autre idée à la place de ${r.name}`}>
          <IconRefresh />
        </button>
      ) : null}
    </article>
  )
}
