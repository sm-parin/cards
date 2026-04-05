/**
 * Minimal i18n utility.
 *
 * All user-visible strings must go through `t()`. No hardcoded strings
 * are allowed in components.
 *
 * Structure is intentionally simple — ready to be swapped with a richer
 * library (e.g. next-intl) without changing call-sites.
 */

import enTranslations from "@/config/locales/en.json";

/** Supported locale identifiers */
export type Locale = "en";

/** Shape of a flat translation map */
type TranslationMap = Record<string, string>;

/** All loaded locales */
const locales: Record<Locale, TranslationMap> = {
  en: enTranslations,
};

/** Active locale — can be changed at runtime via `setLocale()` */
let currentLocale: Locale = "en";

/**
 * Returns the active locale.
 */
export function getLocale(): Locale {
  return currentLocale;
}

/**
 * Switches the active locale.
 * @param locale - Target locale identifier
 */
export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

/**
 * Translates a dot-notation key into the matching string for the
 * currently active locale.
 *
 * Falls back to the raw key when no translation is found so the UI
 * never shows an empty string.
 *
 * @param key - Translation key, e.g. `"home.play_now"`
 * @returns Translated string, or the key itself as a fallback
 *
 * @example
 * t("home.play_now") // → "Play Now"
 */
export function t(key: string): string {
  return locales[currentLocale][key] ?? key;
}
