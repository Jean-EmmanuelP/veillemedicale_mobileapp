/**
 * DEPRECATED: Ce fichier est conservé pour la rétrocompatibilité
 * Utilisez le nouveau design system à la place: import { COLORS } from '@/assets/design-system'
 *
 * Ce fichier mappe les anciennes clés vers le nouveau design system
 */

import { COLORS as DS_COLORS } from '../design-system/colors';

export const COLORS = {
  // Core Palette (nouveau thème: Bleu & Blanc - style Lydia)
  white: DS_COLORS.background.primary,
  black: DS_COLORS.text.primary,

  // Backgrounds
  backgroundPrimary: DS_COLORS.background.primary,       // Blanc principal
  backgroundSecondary: DS_COLORS.background.secondary,   // Gris très clair
  backgroundModal: DS_COLORS.background.primary,         // Blanc pour modals

  // Text
  textPrimary: DS_COLORS.text.primary,                   // Texte principal (presque noir)
  textSecondary: DS_COLORS.text.secondary,               // Texte secondaire (gris)
  textOnPrimaryButton: DS_COLORS.text.white,             // Texte blanc sur boutons bleus
  textOnLightBackground: DS_COLORS.text.primary,         // Texte sur fond clair
  textPlaceholder: DS_COLORS.text.disabled,              // Placeholder gris
  textLink: DS_COLORS.text.link,                         // Liens bleus

  // Borders & Dividers
  borderPrimary: DS_COLORS.border.light,                 // Bordures claires
  borderInput: DS_COLORS.border.medium,                  // Bordures d'inputs

  // Icons
  iconPrimary: DS_COLORS.icon.primary,                   // Icônes principales
  iconSecondary: DS_COLORS.icon.secondary,               // Icônes secondaires

  // Buttons & Interactive Elements
  buttonBackgroundPrimary: DS_COLORS.primary.main,       // Boutons bleus
  buttonBackgroundSecondary: DS_COLORS.background.tertiary, // Boutons secondaires gris
  buttonTextPrimary: DS_COLORS.text.white,               // Texte blanc sur bleu
  buttonTextSecondary: DS_COLORS.text.primary,           // Texte foncé sur gris

  // States
  error: DS_COLORS.error,
  errorBackground: '#FEE2E2',                            // Fond rouge clair
  errorText: DS_COLORS.error,
  success: DS_COLORS.success,
  successBackground: '#D1FAE5',                          // Fond vert clair
  successText: DS_COLORS.success,
  warning: DS_COLORS.warning,
  warningBackground: '#FEF3C7',                          // Fond orange clair
  disabled: DS_COLORS.text.disabled,

  // Specific UI elements
  tabBarBackground: DS_COLORS.background.primary,
  tabBarActiveTint: DS_COLORS.primary.main,              // Bleu pour l'onglet actif
  tabBarInactiveTint: DS_COLORS.icon.secondary,          // Gris pour inactif

  headerBackground: DS_COLORS.background.primary,
  headerText: DS_COLORS.text.primary,

  // Alias directs (compat) — primaire de marque + fond tertiaire
  primary: DS_COLORS.primary.main,                       // lydia-tiber #05403E
  primaryLight: DS_COLORS.primary.light,
  primaryDark: DS_COLORS.primary.dark,
  backgroundTertiary: DS_COLORS.background.tertiary,
} as const;
