/**
 * Design System - Component Styles
 * Styles réutilisables pour composants UI
 */

import { StyleSheet } from 'react-native';
import { COLORS } from './colors';
import { TYPOGRAPHY } from './typography';
import { SPACING } from './spacing';
import { RADIUS } from './radius';
import { SHADOWS } from './shadows';

export const COMPONENT_STYLES = StyleSheet.create({
  // BUTTONS
  buttonPrimary: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: SPACING.buttonPadding.horizontal,
    paddingVertical: SPACING.buttonPadding.vertical,
    borderRadius: RADIUS.button,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.button,
  },
  buttonPrimaryPressed: {
    backgroundColor: COLORS.primary.dark,
  },
  buttonSecondary: {
    backgroundColor: COLORS.background.tertiary,
    paddingHorizontal: SPACING.buttonPadding.horizontal,
    paddingVertical: SPACING.buttonPadding.vertical,
    borderRadius: RADIUS.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    paddingHorizontal: SPACING.buttonPadding.horizontal,
    paddingVertical: SPACING.buttonPadding.vertical,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    ...TYPOGRAPHY.button.medium,
    color: COLORS.text.white,
  },
  buttonTextSecondary: {
    ...TYPOGRAPHY.button.medium,
    color: COLORS.text.primary,
  },

  // CARDS
  card: {
    backgroundColor: COLORS.background.primary,
    borderRadius: RADIUS.card,
    padding: SPACING.cardPadding,
    ...SHADOWS.card,
  },
  cardElevated: {
    backgroundColor: COLORS.background.primary,
    borderRadius: RADIUS.card,
    padding: SPACING.cardPadding,
    ...SHADOWS.md,
  },
  cardOutline: {
    backgroundColor: COLORS.background.primary,
    borderRadius: RADIUS.card,
    padding: SPACING.cardPadding,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },

  // INPUTS
  input: {
    backgroundColor: COLORS.background.primary,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderRadius: RADIUS.input,
    paddingHorizontal: SPACING.inputPadding.horizontal,
    paddingVertical: SPACING.inputPadding.vertical,
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
  },
  inputFocused: {
    borderColor: COLORS.border.focus,
    borderWidth: 2,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  inputLabel: {
    ...TYPOGRAPHY.label.medium,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  inputErrorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },

  // MODALS
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.background.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.background.primary,
    borderRadius: RADIUS.modal,
    padding: SPACING['2xl'],
    width: '90%',
    maxWidth: 400,
    ...SHADOWS.modal,
  },
  modalHeader: {
    ...TYPOGRAPHY.heading.h2,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  modalBody: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    marginBottom: SPACING.lg,
  },

  // BADGES
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.badge,
    alignSelf: 'flex-start',
  },
  badgePrimary: {
    backgroundColor: COLORS.primary.lighter,
  },
  badgeSuccess: {
    backgroundColor: '#D1FAE5',
  },
  badgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  badgeError: {
    backgroundColor: '#FEE2E2',
  },
  badgeText: {
    ...TYPOGRAPHY.label.small,
    color: COLORS.text.primary,
  },

  // DIVIDERS
  divider: {
    height: 1,
    backgroundColor: COLORS.border.light,
    marginVertical: SPACING.md,
  },
  dividerThick: {
    height: 1,
    backgroundColor: COLORS.border.medium,
    marginVertical: SPACING.md,
  },

  // LISTS
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.base,
    backgroundColor: COLORS.background.primary,
  },
  listItemPressed: {
    backgroundColor: COLORS.interaction.pressed,
  },
  listItemText: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    flex: 1,
  },

  // CHIPS (tags)
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.chip,
    backgroundColor: COLORS.background.tertiary,
    marginRight: SPACING.xs,
  },
  chipActive: {
    backgroundColor: COLORS.primary.lighter,
  },
  chipText: {
    ...TYPOGRAPHY.label.small,
    color: COLORS.text.secondary,
  },
  chipTextActive: {
    ...TYPOGRAPHY.label.small,
    color: COLORS.primary.main,
    fontWeight: '600',
  },

  // HEADERS
  screenHeader: {
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.screenPadding,
    backgroundColor: COLORS.background.primary,
  },
  screenTitle: {
    ...TYPOGRAPHY.heading.h1,
    color: COLORS.text.primary,
  },

  // CONTAINERS
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  screenPadding: {
    paddingHorizontal: SPACING.screenPadding,
  },
  section: {
    marginBottom: SPACING.sectionSpacing,
  },
  sectionTitle: {
    ...TYPOGRAPHY.heading.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
});

export const COMPONENT_VARIANTS = {
  button: {
    primary: 'primary',
    secondary: 'secondary',
    outline: 'outline',
    ghost: 'ghost',
  },
  card: {
    default: 'default',
    elevated: 'elevated',
    outline: 'outline',
  },
  badge: {
    primary: 'primary',
    success: 'success',
    warning: 'warning',
    error: 'error',
  },
} as const;
