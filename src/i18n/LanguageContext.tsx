import { createContext, useContext, useState, type ReactNode } from 'react'
import { getLang, setLang, type Lang } from './lang'
import { translations, type T } from './translations'

interface LangCtx { lang: Lang; toggle: () => void }

const Ctx = createContext<LangCtx>({ lang: 'fi', toggle: () => {} })

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getLang)

  function toggle() {
    const next: Lang = lang === 'fi' ? 'en' : 'fi'
    setLang(next)
    setLangState(next)
  }

  return <Ctx.Provider value={{ lang, toggle }}>{children}</Ctx.Provider>
}

export function useLang(): Lang { return useContext(Ctx).lang }
export function useT(): T { return translations[useContext(Ctx).lang] }
export function useLangToggle(): () => void { return useContext(Ctx).toggle }
