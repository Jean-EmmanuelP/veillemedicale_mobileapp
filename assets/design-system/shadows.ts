/**
 * Design System - Shadows
 * Ombres subtiles pour donner de la profondeur
 */

import { COLORS } from './colors';

export const SHADOWS = {
  // Ombres légères (pour élévation subtile)
  sm: {
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },

  // Ombres moyennes (pour cards)
  md: {
    shadowColor: COLORS.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Ombres larges (pour modals)
  lg: {
    shadowColor: COLORS.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },

  // Ombres extra larges (pour overlays)
  xl: {
    shadowColor: COLORS.shadow.dark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },

  // Pas d'ombre
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  // Ombres spécifiques
  button: {
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },

  card: {
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },

  modal: {
    shadowColor: COLORS.shadow.dark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 10,
  },
} as const;

export type ShadowScale = typeof SHADOWS;
