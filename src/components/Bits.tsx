import type { ReactNode } from 'react'

/** Une rangée de pastilles à choisir. `value` vaut '' quand rien n'est choisi ; toucher la pastille choisie la décoche. */
export function ChoiceRow<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string; hint?: string }[]
  value: T | ''
  onChange(v: T | ''): void
  label: string
}) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          className="chip"
          aria-pressed={value === o.id}
          onClick={() => onChange(value === o.id ? '' : o.id)}
        >
          {o.label}
          {o.hint ? <small>{o.hint}</small> : null}
        </button>
      ))}
    </div>
  )
}

export function MultiChoiceRow<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[]
  value: T[]
  onChange(v: T[]): void
  label: string
}) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => {
        const on = value.includes(o.id)
        return (
          <button
            key={o.id}
            type="button"
            className="chip"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== o.id) : [...value, o.id])}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Stars({
  value,
  onChange,
  size = 'md',
  label = 'Note',
}: {
  value: number
  onChange?: (n: number) => void
  size?: 'sm' | 'md'
  label?: string
}) {
  return (
    <div className={`stars ${size}`} role="group" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button
            key={n}
            type="button"
            className={value >= n ? 'on' : ''}
            aria-label={`${n} sur 5`}
            aria-pressed={value === n}
            onClick={() => onChange(value === n ? 0 : n)}
          >
            ★
          </button>
        ) : (
          <span key={n} className={value >= n ? 'on' : ''} aria-hidden="true">
            ★
          </span>
        ),
      )}
    </div>
  )
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <p className="hint">{hint}</p> : null}
    </div>
  )
}
