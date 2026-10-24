/**
 * Design System - Spacing
 * Système d'espacement cohérent basé sur un multiple de 4
 */

export const SPACING = {
  // Base unit: 4px
  xs: 4,     // Extra small
  sm: 8,     // Small
  md: 12,    // Medium
  base: 16,  // Base (défaut)
  lg: 20,    // Large
  xl: 24,    // Extra large
  '2xl': 32, // 2x Extra large
  '3xl': 40, // 3x Extra large
  '4xl': 48, // 4x Extra large
  '5xl': 64, // 5x Extra large
  '6xl': 80, // 6x Extra large

  // Spacing spécifiques
  screenPadding: 16,      // Padding horizontal des écrans
  cardPadding: 16,        // Padding des cards
  sectionSpacing: 24,     // Espacement entre sections
  elementSpacing: 12,     // Espacement entre éléments
  compactSpacing: 8,      // Espacement compact
  buttonPadding: {
    horizontal: 24,
    vertical: 12,
  },
  inputPadding: {
    horizontal: 16,
    vertical: 12,
  },
} as const;

export type SpacingScale = typeof SPACING;
