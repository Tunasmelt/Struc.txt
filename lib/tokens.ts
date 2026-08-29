/* NoteFlow Design Tokens — TypeScript constants for use in logic */

export const TEMPLATES = {
  meeting: { name: 'Meeting minutes', stock: '#E6D6AC', pin: '#C08A2E' },
  soap: { name: 'SOAP note', stock: '#D5E4DA', pin: '#3F7F63' },
  oneonone: { name: '1:1 notes', stock: '#D2DEEC', pin: '#3A6699' },
  journal: { name: 'Journal entry', stock: '#EFD8D3', pin: '#B0574F' },
  lecture: { name: 'Lecture notes', stock: '#E6E3DB', pin: '#69675E' },
  interview: { name: 'Interview notes', stock: '#DFDAEC', pin: '#67589F' },
  fieldlog: { name: 'Field log', stock: '#DCE6E7', pin: '#3B7C86', custom: true }
} as const

export const DEFAULT_TEMPLATE_PIN = '#7C7468'

export const SPACE = {
  railW: 236,
  topbarH: 60,
  drawerW: 440,
  modalW: 620,
  notePadding: '22px 16px 14px',
  noteW: 262,
  noteWMin: 200,
  noteWMax: 380,
  boardPad: '4px 20px 80px',
  boardMinH: 1200,
  boardMinW: 1180,
  railPad: '16px 12px',
  topbarPad: '0 18px',
  gridSnap: 20,
  arrangeGap: 22,
  arrangeRowH: 300,
  stackAnchor: { x: 420, y: 140 },
  stackStep: 3
} as const

export const RADII = {
  base: '2px',
  note: '10px',
  pill: '99px',
  round: '50%',
  pinR: '11px'
} as const

export const MODE_CARD = {
  radius: '10px',
  padding: '14px 16px 14px',
  tilt: false,
  pin: false,
  sheen: false
} as const

export type TemplateType = keyof typeof TEMPLATES
export type AppearanceMode = 'light' | 'dark'
