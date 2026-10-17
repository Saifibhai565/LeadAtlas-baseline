"use client";

import { useT } from "./i18n-provider";

/** Shows a page title, translated when a matching key exists, else the English text. */
export function TitleText({ text, tkey }: { text: string; tkey?: string }) {
  const { t } = useT();
  return <>{tkey ? t(tkey, text) : text}</>;
}
