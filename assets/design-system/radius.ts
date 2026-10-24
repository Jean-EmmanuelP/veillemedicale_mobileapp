/**
 * Design System - Border Radius
 * Charte : contrôles RECTANGULAIRES (comme le web). Seuls les avatars/pastilles
 * restent circulaires (full/avatar). Tout le reste = 0 (carré).
 */

export const RADIUS = {
  none: 0,
  xs: 0,
  sm: 0,
  md: 0,
  base: 0,
  lg: 0,
  xl: 0,
  '2xl': 0,
  full: 9999, // Complètement rond (avatars, pastilles uniquement)

  // Radius spécifiques (tous carrés sauf avatar)
  button: 0,
  card: 0,
  input: 0,
  modal: 0,
  badge: 0,
  avatar: 9999,
  chip: 0,
} as const;

export type RadiusScale = typeof RADIUS;
