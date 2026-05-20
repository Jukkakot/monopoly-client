// Card text translations keyed by "bundleName:CardType:index"
// Keys match what the backend sends in lastCardKey (e.g. "chance:MONEY:0")
export const cardTexts: Record<string, string> = {
  // ── Chance cards ──────────────────────────────────────────────────────────
  'chance:MONEY:0': 'Rakennuslainasi erääntyy. Nosta M150',
  'chance:MONEY:1': 'Pankki maksaa sinulle osinkoa M50',
  'chance:MONEY:2': 'Ylinopeussakko M15',

  'chance:MOVE:0': 'Siirry Boardwalkille',
  'chance:MOVE:1': 'Siirry lähtöruutuun (Nosta M200)',
  'chance:MOVE:2': 'Siirry Illinois Avenuelle. Jos ohitat lähtöruudun, nosta M200',
  'chance:MOVE:3': 'Siirry St. Charles Placelle. Jos ohitat lähtöruudun, nosta M200',
  'chance:MOVE:4': 'Tee matka Reading Railroadille. Jos ohitat lähtöruudun, nosta M200',

  'chance:MOVE_NEAREST:0':
    'Siirry lähimmälle rautatieasemalle. Jos se on vapaana, voit ostaa sen pankilta. Jos se on omistettu, maksa omistajalle kaksinkertainen vuokra',
  'chance:MOVE_NEAREST:1':
    'Siirry lähimmälle laitokselle. Jos se on vapaana, voit ostaa sen pankilta. Jos se on omistettu, heitä noppaa ja maksa omistajalle kymmenkertainen määrä heiton tulokseen verrattuna',

  'chance:MOVE_BACK_3:0': 'Palaa 3 askelta taaksepäin',

  'chance:GO_JAIL:0': 'Mene vankilaan. Mene suoraan vankilaan, älä ohita lähtöruutua, älä nosta M200',

  'chance:OUT_OF_JAIL:0': 'Vapaudu vankilasta ilmaiseksi',

  'chance:REPAIR_PROPERTIES:0':
    'Tee yleiskorjauksia kaikkiin kiinteistöihisi. Maksa M25 jokaisesta talosta. Maksa M100 jokaisesta hotellista',

  'chance:ALL_PLAYERS_MONEY:0':
    'Sinut on valittu hallituksen puheenjohtajaksi. Maksa jokaiselle pelaajalle M50',

  // ── Community Chest cards ─────────────────────────────────────────────────
  'community:MONEY:0': 'Pankkivirhe sinun eduksesi. Nosta M200',
  'community:MONEY:1': 'Lääkärin palkkio. Maksa M50',
  'community:MONEY:2': 'Saat osakkeiden myynnistä M50',
  'community:MONEY:3': 'Lomaraha erääntyy. Saat M100',
  'community:MONEY:4': 'Tuloveron palautus. Nosta M20',
  'community:MONEY:5': 'Henkivakuutus erääntyy. Saat M100',
  'community:MONEY:6': 'Maksa sairaalamaksuja M100',
  'community:MONEY:7': 'Maksa koulumaksuja M50',
  'community:MONEY:8': 'Saat konsultointipalkkion M25',
  'community:MONEY:9': 'Voitit toisen palkinnon kauneuskilpailussa. Nosta M10',
  'community:MONEY:10': 'Perit M100',

  'community:MOVE:0': 'Siirry lähtöruutuun (Nosta M200)',

  'community:OUT_OF_JAIL:0': 'Vapaudu vankilasta ilmaiseksi',

  'community:GO_JAIL:0':
    'Mene vankilaan. Mene suoraan vankilaan, älä ohita lähtöruutua, älä nosta M200',

  'community:ALL_PLAYERS_MONEY:0':
    'Tänään on syntymäpäiväsi. Kerää M10 jokaiselta pelaajalta',

  'community:REPAIR_PROPERTIES:0':
    'Sinulle määrätään katukorjauksia. M40 per talo. M115 per hotelli',
}

export function getCardText(cardKey: string | null, fallback: string | null): string | null {
  if (!cardKey) return fallback
  return cardTexts[cardKey] ?? fallback
}
