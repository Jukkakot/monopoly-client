const HUMAN_NAMES = [
  // Metsäeläimet
  'Karhu', 'Kettu', 'Susi', 'Hirvi', 'Jänis', 'Orava', 'Peura', 'Ilves',
  'Majava', 'Ahma', 'Poro', 'Siili', 'Mäyrä', 'Näätä', 'Saukko', 'Kärppä',
  'Minkki', 'Hilleri', 'Sopuli', 'Myyrä', 'Lepakko', 'Piisami', 'Villisika',
  // Linnut
  'Kotka', 'Haukka', 'Pöllö', 'Kurki', 'Joutsen', 'Varis', 'Harakka',
  'Satakieli', 'Tavi', 'Peippo', 'Tikka', 'Pyy', 'Teeri', 'Metso', 'Kuikka',
  'Tiira', 'Kiuru', 'Västäräkki', 'Punarinta', 'Talitiainen', 'Laulujoutsen',
  // Kalat & vesiötökät
  'Hauki', 'Lohi', 'Ahven', 'Kuha', 'Siika', 'Muikku', 'Särki', 'Lahna',
  'Ankerias', 'Taimen', 'Kirjolohi', 'Made', 'Kampela', 'Turska',
  // Kotieläimet & eksoottisemmat
  'Koira', 'Kissa', 'Hevonen', 'Lammas', 'Vuohi', 'Possu', 'Kana', 'Kukko',
  'Lehmä', 'Härkä', 'Aasi', 'Kani', 'Marsu', 'Hamstari',
]

const BOT_NAMES = [
  // Suomenkieliset robotti-nimet
  'Robo-3000', 'Teräs-Ville', 'Kipinä-9', 'Automaatti', 'Laskuri-X',
  'Binääri', 'Prosessori', 'Sirkuitti', 'Megabitti', 'Kilotavu',
  'Kybori', 'Datanikkari', 'Synapsi', 'Digilätkä', 'Pistoke',
  'Algorytmi', 'Matriixi', 'Verkko-Otto', 'Bitti-Pekka', 'Servo-Matti',
  'HAL-9001', 'R2-F2', 'C-3PÖ', 'Terminator-Jr', 'Robotti-Riku',
  'Kone-Kaija', 'Tekoäly-Timo', 'Laser-6000', 'Turbo-Bot', 'Mega-Manu',
  'CPU-Seppo', 'RAM-Ritva', 'GPU-Gunnar', 'SSD-Sirpa', 'Wifi-Väinö',
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
