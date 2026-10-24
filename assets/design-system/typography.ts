/**
 * Design System - Typography
 * Hiérarchie typographique claire et lisible
 */

export const TYPOGRAPHY = {
  // Font families
  fontFamily: {
    primary: 'Roboto',
    secondary: 'Roboto',
    mono: 'Roboto Mono',
  },

  // Font weights
  fontWeight: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  // Display (grands titres)
  display: {
    large: {
      fontSize: 32,
      lineHeight: 40,
      fontWeight: '700' as const,
      letterSpacing: -0.5,
    },
    medium: {
      fontSize: 28,
      lineHeight: 36,
      fontWeight: '700' as const,
      letterSpacing: -0.3,
    },
    small: {
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '600' as const,
      letterSpacing: -0.2,
    },
  },

  // Headings
  heading: {
    h1: {
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '600' as const,
      letterSpacing: -0.2,
    },
    h2: {
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '600' as const,
      letterSpacing: -0.1,
    },
    h3: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    h4: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
  },

  // Body text
  body: {
    large: {
      fontSize: 17,
      lineHeight: 26,
      fontWeight: '400' as const,
      letterSpacing: 0,
    },
    medium: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '400' as const,
      letterSpacing: 0,
    },
    small: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '400' as const,
      letterSpacing: 0,
    },
  },

  // Labels & UI elements
  label: {
    large: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '500' as const,
      letterSpacing: 0,
    },
    medium: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500' as const,
      letterSpacing: 0,
    },
    small: {
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '500' as const,
      letterSpacing: 0.3,
    },
  },

  // Buttons
  button: {
    large: {
      fontSize: 17,
      lineHeight: 24,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    medium: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    small: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
  },

  // Caption
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
    letterSpacing: 0.2,
  },

  // Overline (petits labels en majuscules)
  overline: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
} as const;

export type TypographyScale = typeof TYPOGRAPHY;
