import { BUDGETS, DIFFICULTIES, FAMILIES, KINDS, SEASONS, TIMES, VEGS, familyOf, labelOf } from './constants'
import type { Recipe } from './types'
import { lastMade } from './util'

function cell(v: string | number): string {
  let s = String(v)
  // Évite qu'un tableur interprète le texte comme une formule.
  if (/^[=+@]/.test(s)) s = `'${s}`
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const HEADER = [
  'Nom',
  'Type',
  'Famille',
  'Régime',
  'Durée',
  'Saisons',
  'Cuisine',
  'Ingrédient principal',
  'Budget',
  'Difficulté',
  'Étiquettes',
  'Note',
  'À tester',
  'Personnes',
  'Dernière fois',
  'Nombre de fois',
  'Journal',
  'Ingrédients',
  'Étapes',
  'Notes',
  'Source',
]

/** Export des recettes en CSV (UTF-8 avec BOM), à ouvrir ou importer dans Google Sheets. */
export function recipesToCsv(recipes: Recipe[]): string {
  const rows = recipes
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    .map((r) =>
      [
        r.name,
        labelOf(KINDS, r.kind),
        labelOf(FAMILIES, familyOf(r.kind) as 'sale'),
        labelOf(VEGS, r.veg),
        labelOf(TIMES, r.time),
        r.seasons.map((s) => labelOf(SEASONS, s)).join(', '),
        r.cuisine,
        r.main,
        labelOf(BUDGETS, r.budget),
        labelOf(DIFFICULTIES, r.difficulty),
        r.tags.join(', '),
        r.rating || '',
        r.toTry ? 'oui' : '',
        r.servings,
        lastMade(r),
        r.journal.length,
        r.journal
          .map((e) => `${e.date}${e.rating ? ` (${e.rating}/5)` : ''}${e.comment ? ` ${e.comment}` : ''}`)
          .join(' | '),
        r.ingredients,
        r.steps,
        r.notes,
        r.source,
      ]
        .map(cell)
        .join(','),
    )
  return `﻿${[HEADER.map(cell).join(','), ...rows].join('\r\n')}\r\n`
}

/** Télécharge un texte comme fichier (fonctionne dans un navigateur ou une appli installée). */
export function downloadText(filename: string, text: string, mime = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}
