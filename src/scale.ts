/** Quantités proportionnelles : « 200 g de farine » pour 4 devient « 100 g de farine » pour 2. */

const GLYPH: Record<string, number> = {
  '½': 0.5,
  '¼': 0.25,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅛': 0.125,
}

const NUM = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?[½¼¾⅓⅔⅛]?|[½¼¾⅓⅔⅛])`
const LEAD = new RegExp(
  String.raw`^(\s*(?:[-•*–]\s*)?)(${NUM})(?:\s*(?:-|–|à)\s*(${NUM}))?(?![\d/])`,
  'i',
)

function parseNum(s: string): number {
  const t = s.trim()
  const last = t.slice(-1)
  if (last in GLYPH) {
    const whole = t.slice(0, -1)
    return (whole ? parseFloat(whole.replace(',', '.')) : 0) + GLYPH[last]
  }
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])
  const frac = t.match(/^(\d+)\/(\d+)$/)
  if (frac) return Number(frac[1]) / Number(frac[2])
  return parseFloat(t.replace(',', '.'))
}

function formatNum(n: number): string {
  if (n >= 10) return String(Math.round(n))
  const whole = Math.floor(n + 1e-9)
  const rest = n - whole
  const marks: [number, string][] = [
    [0, ''],
    [0.25, '¼'],
    [1 / 3, '⅓'],
    [0.5, '½'],
    [2 / 3, '⅔'],
    [0.75, '¾'],
    [1, ''],
  ]
  let best = marks[0]
  for (const m of marks) if (Math.abs(rest - m[0]) < Math.abs(rest - best[0])) best = m
  if (Math.abs(rest - best[0]) < 0.06) {
    const w = best[0] === 1 ? whole + 1 : whole
    const g = best[1]
    if (w === 0 && g) return g
    return `${w}${g}`
  }
  return (Math.round(n * 10) / 10).toString().replace('.', ',')
}

/** Multiplie la quantité écrite en début de ligne ; une ligne sans quantité reste telle quelle. */
export function scaleLine(line: string, factor: number): string {
  if (!isFinite(factor) || Math.abs(factor - 1) < 1e-9) return line
  const m = line.match(LEAD)
  if (!m) return line
  const a = formatNum(parseNum(m[2]) * factor)
  const b = m[3] ? formatNum(parseNum(m[3]) * factor) : ''
  const joined = b ? `${a}–${b}` : a
  return `${m[1]}${joined}${line.slice(m[0].length)}`
}

export function splitLines(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

/** Durée trouvée dans une étape (« cuire 20 min », « 1 h 30 »), en secondes, ou null. */
export function timerFromStep(step: string): { seconds: number; label: string } | null {
  const h = step.match(/(\d+)\s*(?:h|heures?)(?:\s*(\d{1,2})(?!\d)\s*(?:min(?:utes?)?)?)?/i)
  const m = step.match(/(\d+)\s*(?:min(?:utes?)?\b)/i)
  if (h) {
    const hours = Number(h[1])
    const mins = h[2] ? Number(h[2]) : 0
    if (hours > 0 && hours < 24) {
      return { seconds: hours * 3600 + mins * 60, label: mins ? `${hours} h ${mins}` : `${hours} h` }
    }
  }
  if (m) {
    const mins = Number(m[1])
    if (mins > 0 && mins <= 600) return { seconds: mins * 60, label: `${mins} min` }
  }
  return null
}
