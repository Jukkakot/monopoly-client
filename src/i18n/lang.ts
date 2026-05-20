export type Lang = 'fi' | 'en'

const KEY = 'monopoly_lang'

export function getLang(): Lang {
  try { return (localStorage.getItem(KEY) as Lang) || 'fi' } catch { return 'fi' }
}

export function setLang(l: Lang): void {
  try { localStorage.setItem(KEY, l) } catch {}
}
