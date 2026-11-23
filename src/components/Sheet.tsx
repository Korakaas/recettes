import { useEffect, type ReactNode } from 'react'
import { useUi } from '../ui'
import { IconBack } from './Icons'

interface Props {
  title: string
  children: ReactNode
  footer?: ReactNode
  actions?: ReactNode
  /** Page de cuisine : texte plus grand. */
  cook?: boolean
}

/** Un écran qui recouvre la page ; le retour du téléphone le ferme. */
export function Sheet({ title, children, footer, actions, cook }: Props) {
  const ui = useUi()

  useEffect(() => {
    document.body.classList.add('lock')
    return () => {
      document.body.classList.remove('lock')
    }
  }, [])

  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) ui.close()
      }}
    >
      <section className={`sheet${cook ? ' cook' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="sheet-head">
          <button type="button" className="icon-btn" onClick={() => ui.close()} aria-label="Retour">
            <IconBack />
          </button>
          <h2>{title}</h2>
          {actions ? <div className="sheet-actions">{actions}</div> : null}
        </header>
        <div className="sheet-body">{children}</div>
        {footer ? <footer className="sheet-foot">{footer}</footer> : null}
      </section>
    </div>
  )
}
