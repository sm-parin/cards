/**
 * Shared Tailwind config base for all Cards platform apps.
 *
 * NOTE: Both game apps use Tailwind v4 with CSS @theme directives in globals.css.
 * They do NOT need to import this config directly — it exists for reference and
 * for any future Tailwind v3-style consumers (e.g. a Storybook setup).
 *
 * Games define their own brand colors (primary) in globals.css @theme blocks.
 */

import type { Config } from 'tailwindcss';

const config: Config = {
  content: [],
  theme: {
    extend: {
      colors: {
        'bg-primary':    '#0a0a0a',
        'bg-surface':    '#111111',
        'bg-elevated':   '#1a1a1a',
        'bg-subtle':     '#222222',
        'bg-border':     '#2a2a2a',
        'text-primary':  '#ffffff',
        'text-secondary':'#a0a0a0',
        'text-muted':    '#555555',
        'accent':        '#e8c84a',
        'accent-hover':  '#f0d060',
        'suit-red':      '#ef4444',
        'suit-black':    '#ffffff',
        'my-turn':       '#e8c84a',
        'connected':     '#4ade80',
        'disconnected':  '#f87171',
      },
      borderRadius: {
        'card': '8px',
      },
      animation: {
        'coin-pop':   'coinPop 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'turn-pulse': 'turnPulse 1.5s ease-in-out infinite',
        'card-deal':  'cardDeal 0.2s ease-out',
        'fade-in':    'fadeIn 0.15s ease-out',
        'slide-up':   'slideUp 0.2s ease-out',
      },
      keyframes: {
        coinPop: {
          '0%':   { transform: 'scale(1)' },
          '50%':  { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
        turnPulse: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
        cardDeal: {
          '0%':   { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',     opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',   opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
