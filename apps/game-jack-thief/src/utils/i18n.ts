/**
 * i18n compatibility shim.
 *
 * Re-exports `t()` from @cards/i18n so all existing imports of
 * `import { t } from '@/utils/i18n'` continue to work unchanged.
 *
 * Game translations are registered in src/app/page.tsx via
 * `registerGameTranslations('en', gameLocale)` before the first render.
 */

export { t, registerGameTranslations } from '@cards/i18n';
export type { Translations as TranslationMap } from '@cards/i18n';

/** Legacy type — kept for backward compatibility */
export type Locale = 'en';

