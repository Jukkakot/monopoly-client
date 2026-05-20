import { getLang } from './lang'

// Card text translations keyed by "bundleName:CardType:index"
// Keys match what the backend sends in lastCardKey (e.g. "chance:MONEY:0")
const cardTextsFi: Record<string, string> = {
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

const cardTextsEn: Record<string, string> = {
  // ── Chance cards ──────────────────────────────────────────────────────────
  'chance:MONEY:0': 'Your building loan matures. Collect M150',
  'chance:MONEY:1': 'Bank pays you dividend of M50',
  'chance:MONEY:2': 'Speeding fine M15',

  'chance:MOVE:0': 'Advance to Boardwalk',
  'chance:MOVE:1': 'Advance to Go (Collect M200)',
  'chance:MOVE:2': 'Advance to Illinois Avenue. If you pass Go, collect M200',
  'chance:MOVE:3': 'Advance to St. Charles Place. If you pass Go, collect M200',
  'chance:MOVE:4': 'Take a trip to Reading Railroad. If you pass Go, collect M200',

  'chance:MOVE_NEAREST:0':
    'Advance token to the nearest Railroad. If unowned you may buy it from the Bank. If owned, pay owner twice the rental',
  'chance:MOVE_NEAREST:1':
    'Advance token to the nearest Utility. If unowned, you may buy it from the Bank. If owned, throw dice and pay owner ten times the amount thrown',

  'chance:MOVE_BACK_3:0': 'Go Back 3 Spaces',

  'chance:GO_JAIL:0': 'Go to Jail. Go directly to Jail, do not pass Go, do not collect M200',

  'chance:OUT_OF_JAIL:0': 'Get Out of Jail Free',

  'chance:REPAIR_PROPERTIES:0':
    'Make general repairs on all your property. For each house pay M25. For each hotel pay M100',

  'chance:ALL_PLAYERS_MONEY:0': 'You have been elected Chairman of the Board. Pay each player M50',

  // ── Community Chest cards ─────────────────────────────────────────────────
  'community:MONEY:0': 'Bank error in your favor. Collect M200',
  'community:MONEY:1': "Doctor's fee. Pay M50",
  'community:MONEY:2': 'From sale of stock you get M50',
  'community:MONEY:3': 'Holiday fund matures. Receive M100',
  'community:MONEY:4': 'Income tax refund. Collect M20',
  'community:MONEY:5': 'Life insurance matures. Collect M100',
  'community:MONEY:6': 'Pay hospital fees of M100',
  'community:MONEY:7': 'Pay school fees of M50',
  'community:MONEY:8': 'Receive M25 consultancy fee',
  'community:MONEY:9': 'You have won second prize in a beauty contest. Collect M10',
  'community:MONEY:10': 'You inherit M100',

  'community:MOVE:0': 'Advance to Go (Collect M200)',

  'community:OUT_OF_JAIL:0': 'Get Out of Jail Free',

  'community:GO_JAIL:0':
    'Go to Jail. Go directly to Jail, do not pass Go, do not collect M200',

  'community:ALL_PLAYERS_MONEY:0': 'It is your birthday. Collect M10 from each player',

  'community:REPAIR_PROPERTIES:0':
    'You are assessed for street repairs. M40 per house. M115 per hotel',
}

export function getCardText(cardKey: string | null, fallback: string | null): string | null {
  if (!cardKey) return fallback
  const lang = getLang()
  const map = lang === 'en' ? cardTextsEn : cardTextsFi
  return map[cardKey] ?? fallback
}
