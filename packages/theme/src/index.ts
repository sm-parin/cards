/**
 * Design tokens for the Cards platform.
 *
 * These are PLATFORM-LEVEL tokens — neutral values shared across all games.
 * Each game's globals.css defines its own primary brand color via
 * Tailwind v4 @theme blocks. Use these tokens in packages/ui components
 * that must work across all games.
 */

export const colors = {
  // Backgrounds
  bgPrimary:    '#0a0a0a',   // page background  (matches all game globals.css)
  bgSurface:    '#111111',   // cards, panels
  bgElevated:   '#1a1a1a',   // modals, dropdowns
  bgSubtle:     '#222222',   // hover states
  bgBorder:     '#2a2a2a',   // borders

  // Text
  textPrimary:   '#ffffff',
  textSecondary: '#a0a0a0',
  textMuted:     '#555555',
  textDisabled:  '#333333',

  // Brand — gold accent works on both green (BQ) and red (JT) game themes
  accent:        '#e8c84a',   // coins, highlights
  accentHover:   '#f0d060',
  accentMuted:   '#3a3010',

  // Semantic
  success:       '#4ade80',
  successMuted:  '#052e16',
  danger:        '#f87171',
  dangerMuted:   '#2d0a0a',
  warning:       '#fbbf24',
  warningMuted:  '#2d1f00',
  info:          '#60a5fa',
  infoMuted:     '#0d1f3c',

  // Card suits
  suitRed:       '#ef4444',   // hearts, diamonds
  suitBlack:     '#ffffff',   // spades, clubs

  // Special game states
  myTurn:        '#e8c84a',   // ring color when it's your turn
  connected:     '#4ade80',   // player connection indicator
  disconnected:  '#f87171',
  waiting:       '#a0a0a0',
} as const;

export const spacing = {
  xs:  '4px',
  sm:  '8px',
  md:  '12px',
  lg:  '16px',
  xl:  '24px',
  xxl: '32px',
} as const;

export const radii = {
  sm:   '4px',
  md:   '8px',
  lg:   '12px',
  xl:   '16px',
  card: '8px',    // playing card corner radius
  pill: '9999px',
} as const;

export const typography = {
  fontSans:  'var(--font-sans, system-ui, sans-serif)',
  fontMono:  'var(--font-mono, monospace)',
  sizeXs:    '11px',
  sizeSm:    '12px',
  sizeMd:    '14px',
  sizeLg:    '16px',
  sizeXl:    '20px',
  sizeXxl:   '24px',
  weightNormal: '400',
  weightMedium: '500',
  weightBold:   '700',
} as const;

export const animation = {
  durationFast:   '100ms',
  durationNormal: '200ms',
  durationSlow:   '400ms',
  easing:         'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const zIndex = {
  base:    0,
  raised:  10,
  overlay: 100,
  modal:   200,
  toast:   300,
} as const;
