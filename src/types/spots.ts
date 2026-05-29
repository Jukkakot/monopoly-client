export type StreetType =
  | 'BROWN' | 'LIGHT_BLUE' | 'PURPLE' | 'ORANGE'
  | 'RED' | 'YELLOW' | 'GREEN' | 'DARK_BLUE'
  | 'RAILROAD' | 'UTILITY' | 'TAX' | 'COMMUNITY' | 'CHANCE' | 'CORNER'

export interface SpotDef {
  id: string
  streetType: StreetType
  name: string
  price?: number
  isProperty: boolean
}

export const STREET_COLORS: Record<string, string> = {
  BROWN: '#8B4513',
  LIGHT_BLUE: '#AAE0FA',
  PURPLE: '#DA3B97',
  ORANGE: '#F7941D',
  RED: '#ED1B24',
  YELLOW: '#FEF200',
  GREEN: '#1FB25A',
  DARK_BLUE: '#0072BB',
  RAILROAD: '#444444',
  UTILITY: '#888888',
}

// 40 spots in board order (index 0 = GO, clockwise)
export const SPOTS: SpotDef[] = [
  { id: 'GO_SPOT',      streetType: 'CORNER',    name: 'GO',               isProperty: false },
  { id: 'B1',           streetType: 'BROWN',     name: 'Katajanokka',      price: 60,  isProperty: true },
  { id: 'COMMUNITY1',   streetType: 'COMMUNITY', name: 'Yhteinen kassa',   isProperty: false },
  { id: 'B2',           streetType: 'BROWN',     name: 'Kruunuhaka',       price: 60,  isProperty: true },
  { id: 'TAX1',         streetType: 'TAX',       name: 'Tulovero',         price: 200, isProperty: false },
  { id: 'RR1',          streetType: 'RAILROAD',  name: 'Rautatieasema',    price: 200, isProperty: true },
  { id: 'LB1',          streetType: 'LIGHT_BLUE',name: 'Kallio',           price: 100, isProperty: true },
  { id: 'CHANCE1',      streetType: 'CHANCE',    name: 'Sattuma',          isProperty: false },
  { id: 'LB2',          streetType: 'LIGHT_BLUE',name: 'Sörnäinen',        price: 100, isProperty: true },
  { id: 'LB3',          streetType: 'LIGHT_BLUE',name: 'Hakaniemi',        price: 120, isProperty: true },
  { id: 'JAIL',         streetType: 'CORNER',    name: 'Vankila',          isProperty: false },
  { id: 'P1',           streetType: 'PURPLE',    name: 'Vallila',          price: 140, isProperty: true },
  { id: 'U1',           streetType: 'UTILITY',   name: 'Sähkölaitos',      price: 150, isProperty: true },
  { id: 'P2',           streetType: 'PURPLE',    name: 'Käpylä',           price: 140, isProperty: true },
  { id: 'P3',           streetType: 'PURPLE',    name: 'Kumpula',          price: 160, isProperty: true },
  { id: 'RR2',          streetType: 'RAILROAD',  name: 'Laivayhtiö',       price: 200, isProperty: true },
  { id: 'O1',           streetType: 'ORANGE',    name: 'Hermanni',         price: 180, isProperty: true },
  { id: 'COMMUNITY2',   streetType: 'COMMUNITY', name: 'Yhteinen kassa',   isProperty: false },
  { id: 'O2',           streetType: 'ORANGE',    name: 'Alppila',          price: 180, isProperty: true },
  { id: 'O3',           streetType: 'ORANGE',    name: 'Pasila',           price: 200, isProperty: true },
  { id: 'FREE_PARKING', streetType: 'CORNER',    name: 'Vapaa pysäköinti', isProperty: false },
  { id: 'R1',           streetType: 'RED',       name: 'Lauttasaari',      price: 220, isProperty: true },
  { id: 'CHANCE2',      streetType: 'CHANCE',    name: 'Sattuma',          isProperty: false },
  { id: 'R2',           streetType: 'RED',       name: 'Munkkivuori',      price: 220, isProperty: true },
  { id: 'R3',           streetType: 'RED',       name: 'Tapiola',          price: 240, isProperty: true },
  { id: 'RR3',          streetType: 'RAILROAD',  name: 'Lentoyhtiö',       price: 200, isProperty: true },
  { id: 'Y1',           streetType: 'YELLOW',    name: 'Otaniemi',         price: 260, isProperty: true },
  { id: 'Y2',           streetType: 'YELLOW',    name: 'Leppävaara',       price: 260, isProperty: true },
  { id: 'U2',           streetType: 'UTILITY',   name: 'Vesilaitos',       price: 150, isProperty: true },
  { id: 'Y3',           streetType: 'YELLOW',    name: 'Matinkylä',        price: 280, isProperty: true },
  { id: 'GO_TO_JAIL',   streetType: 'CORNER',    name: '→ Vankila',        isProperty: false },
  { id: 'G1',           streetType: 'GREEN',     name: 'Espoonlahti',      price: 300, isProperty: true },
  { id: 'G2',           streetType: 'GREEN',     name: 'Sello',            price: 300, isProperty: true },
  { id: 'COMMUNITY3',   streetType: 'COMMUNITY', name: 'Yhteinen kassa',   isProperty: false },
  { id: 'G3',           streetType: 'GREEN',     name: 'Iso Omena',        price: 320, isProperty: true },
  { id: 'RR4',          streetType: 'RAILROAD',  name: 'Bussiyhtiö',       price: 200, isProperty: true },
  { id: 'CHANCE3',      streetType: 'CHANCE',    name: 'Sattuma',          isProperty: false },
  { id: 'DB1',          streetType: 'DARK_BLUE', name: 'Keilaniemi',       price: 350, isProperty: true },
  { id: 'TAX2',         streetType: 'TAX',       name: 'Ylellisyysvero',   price: 100, isProperty: false },
  { id: 'DB2',          streetType: 'DARK_BLUE', name: 'Katajanokka (A)',  price: 400, isProperty: true },
]

// House purchase price per color group (selling price = housePrice / 2)
export const HOUSE_PRICES: Partial<Record<StreetType, number>> = {
  BROWN: 50, LIGHT_BLUE: 50, PURPLE: 100, ORANGE: 100,
  RED: 150, YELLOW: 150, GREEN: 200, DARK_BLUE: 200,
}

// Map spotId -> board index
export const SPOT_INDEX: Record<string, number> = Object.fromEntries(
  SPOTS.map((s, i) => [s.id, i])
)

// Convert board index to CSS Grid row/col (1-based, 11x11)
// Bottom row (idx 0-10): right→left  | Left col (idx 11-20): bottom→top
// Top row (idx 21-30): left→right    | Right col (idx 31-39): top→bottom
export function indexToGridPos(idx: number): { row: number; col: number; isCorner: boolean } {
  const isCorner = idx === 0 || idx === 10 || idx === 20 || idx === 30
  if (idx <= 10) return { row: 11, col: 11 - idx, isCorner }
  if (idx <= 20) return { row: 21 - idx, col: 1, isCorner }
  if (idx <= 30) return { row: 1, col: idx - 19, isCorner }
  return { row: idx - 29, col: 11, isCorner }
}
