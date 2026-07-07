import { getLang } from './lang'

// Card text translations keyed by "bundleName:CardType:index"
// Keys match what the backend sends in lastCardKey (e.g. "chance:MONEY:0")
const cardTextsFi: Record<string, string> = {
  // ── Chance cards ──────────────────────────────────────────────────────────
  'chance:MONEY:0': 'Rakennuslainasi erääntyy. Nosta €150',
  'chance:MONEY:1': 'Pankki maksaa sinulle osinkoa €50',
  'chance:MONEY:2': 'Ylinopeussakko €15',

  'chance:MOVE:0': 'Siirry Katajanokalle (A)',
  'chance:MOVE:1': 'Siirry lähtöruutuun (Nosta €200)',
  'chance:MOVE:2': 'Siirry Tapiolaan. Jos ohitat lähtöruudun, nosta €200',
  'chance:MOVE:3': 'Siirry Vallilaan. Jos ohitat lähtöruudun, nosta €200',
  'chance:MOVE:4': 'Matkusta Rautatieasemalle. Jos ohitat lähtöruudun, nosta €200',

  'chance:MOVE_NEAREST:0':
    'Siirry lähimmälle rautatieasemalle. Jos se on vapaana, voit ostaa sen pankilta. Jos se on omistettu, maksa omistajalle kaksinkertainen vuokra',
  'chance:MOVE_NEAREST:1':
    'Siirry lähimmälle laitokselle. Jos se on vapaana, voit ostaa sen pankilta. Jos se on omistettu, heitä noppaa ja maksa omistajalle kymmenkertainen määrä heiton tulokseen verrattuna',

  'chance:MOVE_BACK_3:0': 'Palaa 3 askelta taaksepäin',

  'chance:GO_JAIL:0': 'Mene vankilaan. Mene suoraan vankilaan, älä ohita lähtöruutua, älä nosta €200',

  'chance:OUT_OF_JAIL:0': 'Vapaudu vankilasta ilmaiseksi',

  'chance:REPAIR_PROPERTIES:0':
    'Tee yleiskorjauksia kaikkiin kiinteistöihisi. Maksa €25 jokaisesta talosta. Maksa €100 jokaisesta hotellista',

  'chance:ALL_PLAYERS_MONEY:0':
    'Sinut on valittu hallituksen puheenjohtajaksi. Maksa jokaiselle pelaajalle €50',

  // ── Community Chest cards ─────────────────────────────────────────────────
  'community:MONEY:0': 'Pankkivirhe sinun eduksesi. Nosta €200',
  'community:MONEY:1': 'Lääkärin palkkio. Maksa €50',
  'community:MONEY:2': 'Saat osakkeiden myynnistä €50',
  'community:MONEY:3': 'Lomaraha erääntyy. Saat €100',
  'community:MONEY:4': 'Tuloveron palautus. Nosta €20',
  'community:MONEY:5': 'Henkivakuutus erääntyy. Saat €100',
  'community:MONEY:6': 'Maksa sairaalamaksuja €100',
  'community:MONEY:7': 'Maksa koulumaksuja €50',
  'community:MONEY:8': 'Saat konsultointipalkkion €25',
  'community:MONEY:9': 'Voitit toisen palkinnon kauneuskilpailussa. Nosta €10',
  'community:MONEY:10': 'Perit €100',

  'community:MOVE:0': 'Siirry lähtöruutuun (Nosta €200)',

  'community:OUT_OF_JAIL:0': 'Vapaudu vankilasta ilmaiseksi',

  'community:GO_JAIL:0':
    'Mene vankilaan. Mene suoraan vankilaan, älä ohita lähtöruutua, älä nosta €200',

  'community:ALL_PLAYERS_MONEY:0':
    'Tänään on syntymäpäiväsi. Kerää €10 jokaiselta pelaajalta',

  'community:REPAIR_PROPERTIES:0':
    'Sinulle määrätään katukorjauksia. €40 per talo. €115 per hotelli',
}

const cardTextsEn: Record<string, string> = {
  // ── Chance cards ──────────────────────────────────────────────────────────
  'chance:MONEY:0': 'Your building loan matures. Collect €150',
  'chance:MONEY:1': 'Bank pays you dividend of €50',
  'chance:MONEY:2': 'Speeding fine €15',

  'chance:MOVE:0': 'Advance to Katajanokka (A)',
  'chance:MOVE:1': 'Advance to Go (Collect €200)',
  'chance:MOVE:2': 'Advance to Tapiola. If you pass Go, collect €200',
  'chance:MOVE:3': 'Advance to Vallila. If you pass Go, collect €200',
  'chance:MOVE:4': 'Take a trip to Rautatieasema. If you pass Go, collect €200',

  'chance:MOVE_NEAREST:0':
    'Advance token to the nearest Railroad. If unowned you may buy it from the Bank. If owned, pay owner twice the rental',
  'chance:MOVE_NEAREST:1':
    'Advance token to the nearest Utility. If unowned, you may buy it from the Bank. If owned, throw dice and pay owner ten times the amount thrown',

  'chance:MOVE_BACK_3:0': 'Go Back 3 Spaces',

  'chance:GO_JAIL:0': 'Go to Jail. Go directly to Jail, do not pass Go, do not collect €200',

  'chance:OUT_OF_JAIL:0': 'Get Out of Jail Free',

  'chance:REPAIR_PROPERTIES:0':
    'Make general repairs on all your property. For each house pay €25. For each hotel pay €100',

  'chance:ALL_PLAYERS_MONEY:0': 'You have been elected Chairman of the Board. Pay each player €50',

  // ── Community Chest cards ─────────────────────────────────────────────────
  'community:MONEY:0': 'Bank error in your favor. Collect €200',
  'community:MONEY:1': "Doctor's fee. Pay €50",
  'community:MONEY:2': 'From sale of stock you get €50',
  'community:MONEY:3': 'Holiday fund matures. Receive €100',
  'community:MONEY:4': 'Income tax refund. Collect €20',
  'community:MONEY:5': 'Life insurance matures. Collect €100',
  'community:MONEY:6': 'Pay hospital fees of €100',
  'community:MONEY:7': 'Pay school fees of €50',
  'community:MONEY:8': 'Receive €25 consultancy fee',
  'community:MONEY:9': 'You have won second prize in a beauty contest. Collect €10',
  'community:MONEY:10': 'You inherit €100',

  'community:MOVE:0': 'Advance to Go (Collect €200)',

  'community:OUT_OF_JAIL:0': 'Get Out of Jail Free',

  'community:GO_JAIL:0':
    'Go to Jail. Go directly to Jail, do not pass Go, do not collect €200',

  'community:ALL_PLAYERS_MONEY:0': 'It is your birthday. Collect €10 from each player',

  'community:REPAIR_PROPERTIES:0':
    'You are assessed for street repairs. €40 per house. €115 per hotel',
}

export function getCardText(cardKey: string | null, fallback: string | null): string | null {
  if (!cardKey) return fallback
  const lang = getLang()
  const map = lang === 'en' ? cardTextsEn : cardTextsFi
  return map[cardKey] ?? fallback
}
