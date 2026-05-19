// Rent tables per property id.
// Index: [0]=no house, [1]=1 house, [2]=2 houses, [3]=3 houses, [4]=4 houses, [5]=hotel
// For railroads: [0]=1 RR owned, [1]=2, [2]=3, [3]=4
// Utilities: special (4× or 10× dice)
// mortgageValue = price / 2

export const RENT_TABLE: Record<string, number[]> = {
  // BROWN
  B1:  [2,  10,  30,  90, 160, 250],
  B2:  [4,  20,  60, 180, 320, 450],
  // LIGHT BLUE
  LB1: [6,  30,  90, 270, 400, 550],
  LB2: [6,  30,  90, 270, 400, 550],
  LB3: [8,  40, 100, 300, 450, 600],
  // PURPLE
  P1:  [10, 50, 150, 450, 625, 750],
  P2:  [10, 50, 150, 450, 625, 750],
  P3:  [12, 60, 180, 500, 700, 900],
  // ORANGE
  O1:  [14, 70, 200, 550, 750, 950],
  O2:  [14, 70, 200, 550, 750, 950],
  O3:  [16, 80, 220, 600, 800, 1000],
  // RED
  R1:  [18, 90,  250,  700,  875, 1050],
  R2:  [18, 90,  250,  700,  875, 1050],
  R3:  [20, 100, 300,  750,  925, 1100],
  // YELLOW
  Y1:  [22, 110, 330,  800,  975, 1150],
  Y2:  [22, 110, 330,  800,  975, 1150],
  Y3:  [24, 120, 360,  850, 1025, 1200],
  // GREEN
  G1:  [26, 130, 390,  900, 1100, 1275],
  G2:  [26, 130, 390,  900, 1100, 1275],
  G3:  [28, 150, 450, 1000, 1200, 1400],
  // DARK BLUE
  DB1: [35, 175, 500, 1100, 1300, 1500],
  DB2: [50, 200, 600, 1400, 1700, 2000],
  // RAILROADS (rent by number of RRs owned: 1, 2, 3, 4)
  RR1: [25, 50, 100, 200],
  RR2: [25, 50, 100, 200],
  RR3: [25, 50, 100, 200],
  RR4: [25, 50, 100, 200],
  // UTILITIES: special
  U1: [],
  U2: [],
}

export const GROUP_SIZE: Record<string, number> = {
  BROWN: 2, LIGHT_BLUE: 3, PURPLE: 3, ORANGE: 3,
  RED: 3, YELLOW: 3, GREEN: 3, DARK_BLUE: 2,
  RAILROAD: 4, UTILITY: 2,
}
