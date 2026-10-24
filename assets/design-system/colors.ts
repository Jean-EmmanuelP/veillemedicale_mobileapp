/**
 * Design System - Colors
 * Aligné sur la charte Veille Médicale (med_kit/frontend/docs/CHARTE_GRAPHIQUE.md) :
 * primaire "lydia-tiber" #05403E, grades A/B/C = emerald/amber/orange.
 */

export const COLORS = {
  // Couleurs principales (lydia-tiber)
  primary: {
    main: '#05403E',      // Primaire (lydia-tiber)
    light: '#07524F',     // tiber-light (hover)
    dark: '#032E2C',      // tiber-dark (pressed)
    lighter: '#E6F0EF',   // teinte très claire pour backgrounds
    subtle: '#F1F6F5',    // ultra subtil
  },

  // Backgrounds
  background: {
    primary: '#FFFFFF',   // Blanc principal
    secondary: '#F5F7FA', // Gris très clair
    tertiary: '#EDF2F7',  // Gris subtil pour cards
    overlay: 'rgba(0, 0, 0, 0.4)', // Overlay pour modals
  },

  // Textes
  text: {
    primary: '#1A202C',   // Texte principal (presque noir)
    secondary: '#4A5568', // Texte secondaire
    tertiary: '#718096',  // Texte tertiaire
    disabled: '#A0AEC0',  // Texte désactivé
    white: '#FFFFFF',     // Texte blanc pour boutons
    link: '#05403E',      // Liens (= primary)
  },

  // Bordures
  border: {
    light: '#E2E8F0',     // Bordure légère
    medium: '#CBD5E0',    // Bordure moyenne
    dark: '#A0AEC0',      // Bordure foncée
    focus: '#05403E',     // Bordure au focus
  },

  // États
  success: '#10B981',     // Vert succès
  warning: '#F59E0B',     // Orange warning
  error: '#EF4444',       // Rouge erreur
  errorBackground: '#FEE2E2', // Fond rouge clair
  info: '#05403E',        // Info = primary

  // Grades (charte : A emerald, B amber, C orange, R violet)
  grade: {
    A: '#059669',         // emerald
    B: '#D97706',         // amber
    C: '#EA580C',         // orange
    R: '#8B5CF6',         // violet
  },

  // Interactions
  interaction: {
    hover: '#F7FAFC',     // Hover léger
    pressed: '#EDF2F7',   // Pressed
    selected: '#E6F0EF',  // Sélectionné (teinte tiber claire)
    focus: 'rgba(5, 64, 62, 0.1)', // Focus ring (tiber)
  },

  // Icônes
  icon: {
    primary: '#4A5568',   // Icônes principales
    secondary: '#A0AEC0', // Icônes secondaires
    active: '#05403E',    // Icônes actives (= primary)
    white: '#FFFFFF',     // Icônes blanches
  },

  // Shadow colors (pour les ombres)
  shadow: {
    light: 'rgba(0, 0, 0, 0.05)',
    medium: 'rgba(0, 0, 0, 0.1)',
    dark: 'rgba(0, 0, 0, 0.15)',
  },

  // Spécifiques métier
  journal: {
    background: '#E6F0EF',
    text: '#05403E',
  },

  // Dégradés (utilisés avec parcimonie)
  gradient: {
    primary: ['#05403E', '#032E2C'],
    subtle: ['#F1F6F5', '#FFFFFF'],
  },
} as const;

// Types pour TypeScript
export type ColorPalette = typeof COLORS;
export type PrimaryColor = keyof typeof COLORS.primary;
export type BackgroundColor = keyof typeof COLORS.background;
export type TextColor = keyof typeof COLORS.text;
