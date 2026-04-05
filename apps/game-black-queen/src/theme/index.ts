/**
 * Design token definitions for the Black Queen platform.
 *
 * All colors, spacing units, and typography values must be sourced
 * from here. Components must NOT use hardcoded values.
 *
 * CSS custom properties in globals.css are kept in sync with these tokens
 * so that Tailwind v4 utility classes (e.g. `bg-primary`) resolve to the
 * same values.
 */

export const theme = {
  colors: {
    /** Main brand color – used for primary actions */
    primary: "#16a34a",
    /** Hover/active shade of primary */
    primaryDark: "#15803d",
    /** Secondary accent */
    secondary: "#1d4ed8",
    secondaryDark: "#1e40af",

    background: "#0a0a0a",
    surface: "#141414",
    border: "#27272a",

    foreground: "#fafafa",
    muted: "#71717a",

    danger: "#dc2626",
    success: "#16a34a",
    warning: "#d97706",
  },

  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
    "3xl": "4rem",
  },

  typography: {
    fontSizes: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
    },
    fontWeights: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },
    lineHeights: {
      tight: "1.25",
      normal: "1.5",
      relaxed: "1.75",
    },
  },

  borderRadius: {
    sm: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    xl: "0.75rem",
    full: "9999px",
  },
} as const;

export type Theme = typeof theme;
