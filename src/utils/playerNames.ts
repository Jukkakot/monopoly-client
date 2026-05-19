const HUMAN_NAMES = [
  'Karhu', 'Kettu', 'Susi', 'Hirvi', 'Jänis', 'Orava', 'Peura', 'Ilves',
  'Majava', 'Ahma', 'Poro', 'Kotka', 'Haukka', 'Pöllö', 'Hauki', 'Lohi',
  'Siili', 'Mäyrä', 'Tavi', 'Kurki', 'Joutsen', 'Varis', 'Harakka', 'Satakieli',
]

const BOT_NAMES = [
  'Robo-3000', 'Kipinä', 'Teräs-Ville', 'Algorytmi', 'Binääri', 'Prosessori',
  'Sirkuitti', 'Megabitti', 'Automaatti', 'Laskuri', 'Pistoke', 'Kilotavu',
  'Kybori', 'Datanikkari', 'Synapsi', 'Digilätkä',
]

function pickRandom<T>(arr: T[], exclude: T[] = []): T {
  const pool = arr.filter(x => !exclude.includes(x))
  const source = pool.length > 0 ? pool : arr
  return source[Math.floor(Math.random() * source.length)]
}

export function randomHumanName(exclude: string[] = []): string {
  return pickRandom(HUMAN_NAMES, exclude)
}

export function randomBotName(exclude: string[] = []): string {
  return pickRandom(BOT_NAMES, exclude)
}
