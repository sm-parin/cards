import platformEn from './locales/en.json';

type Translations = Record<string, string>;
type Interpolations = Record<string, string | number>;

// Platform-level translations — always available
const platformTranslations: Record<string, Translations> = {
  en: platformEn as Translations,
};

// Game-level translations — registered by each game on startup
const gameTranslations: Record<string, Translations> = {};

/**
 * Register game-specific translations.
 * Game translations take precedence over platform translations.
 * Call this once at the top of each game's entry point (before any render).
 *
 * @example
 * import { registerGameTranslations } from '@cards/i18n';
 * import gameEn from '../config/locales/en.json';
 * registerGameTranslations('en', gameEn);
 */
export function registerGameTranslations(
  locale: string,
  translations: Translations
): void {
  gameTranslations[locale] = {
    ...(gameTranslations[locale] ?? {}),
    ...translations,
  };
}

/**
 * Translate a key.
 * Checks game translations first, falls back to platform translations.
 * Supports {{variable}} interpolation.
 *
 * @example
 * t('auth.logout')
 * t('game.their_turn', { username: 'Alice' })
 * t('coins.earned', { amount: 200 })
 */
export function t(
  key: string,
  interpolations?: Interpolations,
  locale = 'en'
): string {
  const gameDict = gameTranslations[locale] ?? {};
  const platformDict = platformTranslations[locale] ?? {};

  let value = gameDict[key] ?? platformDict[key];

  if (value === undefined) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[i18n] Missing translation key: "${key}"`);
    }
    return key;
  }

  if (interpolations) {
    Object.entries(interpolations).forEach(([k, v]) => {
      value = (value as string).replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    });
  }

  return value as string;
}

export type { Translations };
