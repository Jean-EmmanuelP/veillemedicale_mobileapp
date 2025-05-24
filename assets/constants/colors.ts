export const COLORS = {
  // Core Palette (Perplexity-inspired Black & White)
  white: '#FFFFFF',
  black: '#000000',
  
  // Backgrounds
  backgroundPrimary: '#FFFFFF',       // Main app background
  backgroundSecondary: '#F5F5F5',     // Subtle contrast, like cards or dividers
  backgroundModal: '#FFFFFF',         // Modal backgrounds

  // Text
  textPrimary: '#000000',             // Primary text (most content)
  textSecondary: '#555555',           // Lighter text for less emphasis
  textOnPrimaryButton: '#FFFFFF',     // Text on dark buttons
  textOnLightBackground: '#000000',   // General text on white/light backgrounds
  textPlaceholder: '#A0A0A0',         // Placeholder text in inputs
  textLink: '#000000',                // Links can be black, relying on underline or context

  // Borders & Dividers
  borderPrimary: '#E0E0E0',           // Light borders
  borderInput: '#CCCCCC',             // Input field borders

  // Icons
  iconPrimary: '#000000',             // Main icons
  iconSecondary: '#777777',           // Less prominent icons

  // Buttons & Interactive Elements
  buttonBackgroundPrimary: '#000000', // Primary buttons (black background)
  buttonBackgroundSecondary: '#EFEFEF',// Secondary/ghost buttons (light gray background)
  buttonTextPrimary: '#FFFFFF',       // Text on primary (black) buttons
  buttonTextSecondary: '#000000',     // Text on secondary (light gray) buttons
  
  // States
  error: '#D32F2F',                   // Keep a distinct error color for usability
  success: '#388E3C',                 // Keep a distinct success color for usability
  disabled: '#BDBDBD',                // For disabled elements

  // Specific UI elements if needed
  tabBarBackground: '#FFFFFF',
  tabBarActiveTint: '#000000',
  tabBarInactiveTint: '#777777',

  headerBackground: '#FFFFFF',
  headerText: '#000000',

  // You can add more as we go through the components
} as const; 