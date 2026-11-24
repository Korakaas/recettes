import { KINDS, SEASONS, TIMES } from './constants'
import type { Settings } from './settings'
import type { Kind, Level, RecipeDraft, Season, TimeBucket, Veg } from './types'
import { norm } from './util'

export type AiErrorKind = 'no-key' | 'auth' | 'rate' | 'network' | 'server' | 'other'

export class AiError extends Error {
  kind: AiErrorKind
  constructor(kind: AiErrorKind, message: string) {
    super(message)
    this.kind = kind
  }
}

interface Block {
  type: string
  name?: string
  input?: unknown
  text?: string
  [k: string]: unknown
}

interface ApiResponse {
  content: Block[]
  stop_reason?: string
}

async function readApiMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: { message?: string } }
    return data.error?.message ?? ''
  } catch {
    return ''
  }
}

/** Appel direct à l'API Claude depuis le téléphone, avec la clé enregistrée dans les réglages. */
async function post(settings: Settings, body: Record<string, unknown>): Promise<ApiResponse> {
  if (!settings.apiKey) {
    throw new AiError('no-key', 'Ajoute ta clé API dans les réglages pour utiliser Claude.')
  }
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 120_000)
  let res: Response
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
        // Obligatoire pour appeler l'API depuis un navigateur.
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new AiError('network', 'La requête a pris trop de temps. Réessaie.')
    }
    throw new AiError('network', 'Impossible de joindre Claude. Vérifie ta connexion.')
  } finally {
    window.clearTimeout(timeout)
  }
  if (!res.ok) {
    const detail = await readApiMessage(res)
    if (res.status === 401 || res.status === 403) {
      throw new AiError('auth', 'Clé API refusée. Vérifie-la dans les réglages.')
    }
    if (res.status === 404) {
      throw new AiError('other', `Modèle introuvable (« ${String(body.model)} »). Vérifie son nom dans les réglages.`)
    }
    if (res.status === 429) {
      throw new AiError('rate', 'Trop de demandes (ou crédit épuisé). Réessaie dans une minute.')
    }
    if (res.status >= 500) {
      throw new AiError('server', 'Le service est surchargé. Réessaie dans un instant.')
    }
    throw new AiError('other', detail ? `Erreur : ${detail}` : `Erreur ${res.status}.`)
  }
  return (await res.json()) as ApiResponse
}

const RECIPE_ITEM = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Nom de la recette.' },
    kind: { type: 'string', enum: [...KINDS.map((k) => k.id), ''] },
    veg: { type: 'string', enum: ['oui', 'non', ''] },
    time: { type: 'string', enum: [...TIMES.map((t) => t.id), ''] },
    seasons: { type: 'array', items: { type: 'string', enum: SEASONS.map((s) => s.id) } },
    cuisine: { type: 'string' },
    main: { type: 'string', description: 'Ingrédient principal, au singulier.' },
    budget: { type: 'integer', enum: [0, 1, 2, 3] },
    difficulty: { type: 'integer', enum: [0, 1, 2, 3] },
    tags: { type: 'array', items: { type: 'string' } },
    servings: { type: 'integer', description: 'Nombre de personnes de la recette d’origine.' },
    ingredients: { type: 'array', items: { type: 'string' }, description: 'Un ingrédient par entrée, quantité en tête.' },
    steps: { type: 'array', items: { type: 'string' }, description: 'Une étape par entrée.' },
    notes: { type: 'string' },
  },
  required: ['name'],
}

const TOOL = {
  name: 'submit_recipes',
  description: 'Renvoie les recettes lues ou classées.',
  input_schema: {
    type: 'object',
    properties: {
      found: { type: 'boolean', description: 'false si aucune recette exploitable.' },
      message: { type: 'string', description: 'Si found est false : la raison en une phrase.' },
      recipes: { type: 'array', items: RECIPE_ITEM },
    },
    required: ['found', 'recipes'],
  },
}

const RULES = `Tu aides un couple à ranger ses recettes de cuisine maison (cuisine du quotidien, repas pour deux avec des restes : quantités pour 4 par défaut). Tu réponds uniquement en appelant l'outil submit_recipes, en français.
Règles de classement :
- kind : entree, plat, accompagnement, dessert, gateau (gâteau, cake, goûter), pain (pain, brioche, viennoiserie, pâte à pizza), apero (apéritif, tapas, houmous).
- veg : "oui" seulement si le plat ne contient ni viande, ni poisson, ni fruits de mer (œufs et laitages acceptés), sinon "non".
- time : rapide (moins de 30 min en tout), moyen (30 min à 1 h), long (plus d'1 h, repos longs compris).
- seasons : les saisons où l'on a naturellement envie de le faire, plusieurs possibles ; "toute" si aucune saison ne s'impose. Tiens compte des légumes et fruits de saison en France métropolitaine présents dans la recette (asperges, petits pois : printemps ; tomates, courgettes, aubergines, poivrons : été ; courges, champignons, châtaignes : automne ; choux, poireaux, endives, racines : hiver) et du côté réconfortant (plat mijoté, fondu) ou rafraîchissant (salade, plat froid). Quand les ingrédients sont connus, ils priment sur le nom du plat.
- cuisine : origine ou style en un mot ("Italienne", "Indienne", "Française"). main : l'ingrédient principal en un ou deux mots, au singulier ("Poulet", "Courge").
- budget : 1 économique, 2 normal, 3 festif ou coûteux. difficulty : 1 facile, 2 moyen, 3 technique.
- tags : 0 à 3 étiquettes courtes en minuscules (par exemple "réconfort", "four", "une seule casserole", "invités", "léger").
- Si tu hésites vraiment, laisse le champ vide ("" ou 0 ou liste vide) plutôt que de deviner.
- Ne change jamais le nom d'une recette donnée par l'utilisateur.`

const IMPORT_RULES = `Pour une recette détaillée, remplis aussi ingredients (une entrée par ingrédient, avec la quantité, par exemple "200 g de farine") et steps (étapes courtes reformulées avec tes mots, avec les temps et les températures). Ne recopie pas les textes tels quels. servings est le nombre de personnes de la recette d'origine. N'invente rien : si une information est absente, laisse le champ vide.
Si le contenu ne contient aucune recette lisible (vidéo sans description, page protégée ou qui demande JavaScript), mets found à false et explique en une phrase pourquoi dans message.`

export interface Extracted {
  found: boolean
  message: string
  drafts: (Partial<RecipeDraft> & { name: string })[]
}

function asLevel(v: unknown): Level {
  const n = Math.round(Number(v))
  return n === 1 || n === 2 || n === 3 ? n : 0
}

function lines(v: unknown): string {
  return Array.isArray(v)
    ? v
        .map((x) => String(x).trim())
        .filter(Boolean)
        .join('\n')
    : ''
}

/** Nettoie ce que renvoie Claude : seules les valeurs prévues passent. */
function toDraft(raw: Record<string, unknown>): Partial<RecipeDraft> {
  const out: Partial<RecipeDraft> = { name: String(raw.name ?? '').trim() }
  if (KINDS.some((k) => k.id === raw.kind)) out.kind = raw.kind as Kind
  if (raw.veg === 'oui' || raw.veg === 'non') out.veg = raw.veg as Veg
  if (TIMES.some((t) => t.id === raw.time)) out.time = raw.time as TimeBucket
  if (Array.isArray(raw.seasons)) {
    const s = raw.seasons.filter((x) => SEASONS.some((y) => y.id === x)) as Season[]
    out.seasons = s.includes('toute') ? ['toute'] : s
  }
  if (typeof raw.cuisine === 'string') out.cuisine = raw.cuisine.trim()
  if (typeof raw.main === 'string') out.main = raw.main.trim()
  out.budget = asLevel(raw.budget)
  out.difficulty = asLevel(raw.difficulty)
  if (Array.isArray(raw.tags)) {
    out.tags = raw.tags
      .map((t) => String(t).trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 4)
  }
  const servings = Math.round(Number(raw.servings))
  if (servings > 0 && servings < 100) out.servings = servings
  const ing = lines(raw.ingredients)
  if (ing) out.ingredients = ing
  const steps = lines(raw.steps)
  if (steps) out.steps = steps
  if (typeof raw.notes === 'string' && raw.notes.trim()) out.notes = raw.notes.trim()
  return out
}

function parseResult(input: unknown): Extracted {
  const o = (input ?? {}) as Record<string, unknown>
  const list = Array.isArray(o.recipes) ? (o.recipes as Record<string, unknown>[]) : []
  const drafts = list.map(toDraft).filter((d): d is Partial<RecipeDraft> & { name: string } => !!d.name)
  return {
    found: o.found !== false && drafts.length > 0,
    message: typeof o.message === 'string' ? o.message : '',
    drafts,
  }
}

interface RunOptions {
  model: string
  system: string
  content: string | Record<string, unknown>[]
  serverTools?: Record<string, unknown>[]
  maxTokens?: number
}

/** Envoie la demande, laisse Claude lire la page si besoin, et récupère le résultat de l'outil. */
async function run(settings: Settings, opts: RunOptions): Promise<Extracted> {
  const tools = [...(opts.serverTools ?? []), TOOL]
  let messages: Record<string, unknown>[] = [{ role: 'user', content: opts.content }]
  let nudged = false
  for (let turn = 0; turn < 5; turn++) {
    const res = await post(settings, {
      model: opts.model,
      max_tokens: opts.maxTokens ?? 4096,
      system: opts.system,
      tools,
      tool_choice: { type: 'auto' },
      messages,
    })
    const use = res.content.find((b) => b.type === 'tool_use' && b.name === TOOL.name)
    if (use) return parseResult(use.input)
    if (!res.content.length) break
    if (res.stop_reason === 'pause_turn') {
      messages = [...messages, { role: 'assistant', content: res.content }]
      continue
    }
    // Réponse en texte seul : on relance une fois en demandant l'outil.
    if (!nudged) {
      nudged = true
      messages = [
        ...messages,
        { role: 'assistant', content: res.content },
        { role: 'user', content: 'Réponds en appelant l’outil submit_recipes.' },
      ]
      continue
    }
    break
  }
  throw new AiError('other', 'Claude n’a pas renvoyé de résultat exploitable. Réessaie.')
}

const CHUNK = 30

/** Propose un classement pour des noms de recettes (par lots). Les résultats suivent l'ordre des noms. */
export async function classifyNames(
  settings: Settings,
  names: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<(Partial<RecipeDraft> | null)[]> {
  const out: (Partial<RecipeDraft> | null)[] = []
  for (let i = 0; i < names.length; i += CHUNK) {
    const part = names.slice(i, i + CHUNK)
    const listText = part.map((n, k) => `${k + 1}. ${n}`).join('\n')
    const res = await run(settings, {
      model: settings.lightModel,
      system: RULES,
      content: `Classe ces ${part.length} recettes. Renvoie exactement une entrée par recette, dans le même ordre, avec le nom tel quel. Ne remplis ni ingredients, ni steps.\n\n${listText}`,
      maxTokens: 8000,
    })
    const byName = new Map(res.drafts.map((d) => [norm(d.name), d]))
    part.forEach((n, k) => {
      const hit = byName.get(norm(n)) ?? (res.drafts.length === part.length ? res.drafts[k] : undefined)
      out.push(hit ?? null)
    })
    onProgress?.(Math.min(i + CHUNK, names.length), names.length)
  }
  return out
}

export async function importFromUrl(settings: Settings, url: string): Promise<Extracted> {
  const res = await run(settings, {
    model: settings.model,
    system: `${RULES}\n${IMPORT_RULES}\nTu lis la page avec l'outil web_fetch, puis tu appelles submit_recipes avec une seule recette. Pour une vidéo, la recette est parfois dans la description : sinon found est false.`,
    content: `Importe la recette de cette page : ${url}`,
    serverTools: [{ type: 'web_fetch_20250910', name: 'web_fetch', max_uses: 2, max_content_tokens: 40000 }],
  })
  res.drafts.forEach((d) => {
    d.source = url
  })
  return res
}

export async function importFromText(settings: Settings, text: string): Promise<Extracted> {
  return run(settings, {
    model: settings.model,
    system: `${RULES}\n${IMPORT_RULES}\nRenvoie une seule recette.`,
    content: `Voici le texte d'une recette (copié d'un site, d'une vidéo ou d'un livre) :\n\n${text.slice(0, 30_000)}`,
  })
}

export async function importFromImage(settings: Settings, base64Jpeg: string): Promise<Extracted> {
  return run(settings, {
    model: settings.model,
    system: `${RULES}\n${IMPORT_RULES}\nSi l'image est une liste de plats ou un carnet d'idées de recettes, renvoie une entrée par plat avec le nom exact (corrige les fautes de lecture évidentes), sans ingredients ni steps, et un classement seulement s'il est évident. Si c'est une recette détaillée, renvoie une seule recette complète.`,
    content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Jpeg } },
      { type: 'text', text: 'Lis cette photo.' },
    ],
    maxTokens: 8000,
  })
}

/** Réduit une photo (taille et poids) avant de l'envoyer : JPEG, 1600 px au plus. */
export async function photoToBase64(file: File, maxSide = 1600): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new AiError('other', 'Impossible de lire cette photo.')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const url = canvas.toDataURL('image/jpeg', 0.82)
  return url.slice(url.indexOf(',') + 1)
}
