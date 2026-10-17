"use client";

import { createContext, useContext } from "react";
import { type Lang, translator } from "@/lib/i18n";

const Ctx = createContext<{ lang: Lang; t: ReturnType<typeof translator> }>({ lang: "en", t: translator("en") });

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <Ctx.Provider value={{ lang, t: translator(lang) }}>{children}</Ctx.Provider>;
}

/** useT().t("nav.leads") in any client component. */
export function useT() {
  return useContext(Ctx);
}

/** Switches language and reloads so the whole app re-renders in it. */
export function setLanguage(lang: Lang) {
  document.cookie = `lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
  window.location.reload();
}
