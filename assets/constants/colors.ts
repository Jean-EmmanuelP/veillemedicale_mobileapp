export const COLORS = {
  // Core Palette (Dark Theme - Black & White)
  white: '#FFFFFF',
  black: '#000000',
  
  // Backgrounds
  backgroundPrimary: '#000000',       // Main app background (black)
  backgroundSecondary: '#181818',     // Subtle contrast, like cards or dividers (dark gray)
  backgroundModal: '#000000',         // Modal backgrounds (black)

  // Text
  textPrimary: '#FFFFFF',             // Primary text (white)
  textSecondary: '#AAAAAA',           // Lighter text for less emphasis (light gray)
  textOnPrimaryButton: '#000000',     // Text on light buttons (black on white)
  textOnLightBackground: '#FFFFFF',   // General text on dark backgrounds (white)
  textPlaceholder: '#666666',         // Placeholder text in inputs (medium gray)
  textLink: '#FFFFFF',                // Links can be white, relying on underline or context

  // Borders & Dividers
  borderPrimary: '#333333',           // Dark borders
  borderInput: '#444444',             // Input field borders

  // Icons
  iconPrimary: '#FFFFFF',             // Main icons (white)
  iconSecondary: '#AAAAAA',           // Less prominent icons (light gray)

  // Buttons & Interactive Elements
  buttonBackgroundPrimary: '#FFFFFF', // Primary buttons (white background)
  buttonBackgroundSecondary: '#181818',// Secondary/ghost buttons (dark gray background)
  buttonTextPrimary: '#000000',       // Text on primary (white) buttons
  buttonTextSecondary: '#FFFFFF',     // Text on secondary (dark gray) buttons
  
  // States
  error: '#FF6B6B',                   // Slightly softer red for dark theme
  errorBackground: '#2D1B1B',         // Dark red background for error states
  errorText: '#FF6B6B',               // Red text for errors
  success: '#4CAF50',                 // Keep green for success
  successBackground: '#1B2D1B',       // Dark green background for success states
  successText: '#4CAF50',             // Green text for success
  warning: '#FFC107',                 // Warning/info color (amber)
  warningBackground: 'rgba(255, 193, 7, 0.1)', // Warning background
  disabled: '#555555',                // For disabled elements

  // Specific UI elements
  tabBarBackground: '#000000',
  tabBarActiveTint: '#FFFFFF',
  tabBarInactiveTint: '#AAAAAA',

  headerBackground: '#000000',
  headerText: '#FFFFFF',

  // You can add more as we go through the components
} as const; 