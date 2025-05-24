import { StyleSheet } from 'react-native';
import { FONTS, FONT_SIZES } from '../assets/constants/fonts';
import { COLORS } from '../assets/constants/colors';

export const globalTextStyles = StyleSheet.create({
  default: {
    fontFamily: FONTS.sans.regular, // Default to Roboto Regular
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary, // Use new text color
  },
  bold: {
    fontFamily: FONTS.sans.bold, // Roboto Bold
    color: COLORS.textPrimary, // Ensure bold text also uses primary color or specific variant
  },
  light: {
    fontFamily: FONTS.sans.light, // Roboto Light
    color: COLORS.textSecondary, // Light text might use secondary color
  },
  // Add other common variations as needed
});

// You could also define heading styles here
export const headingStyles = StyleSheet.create({
  h1: {
    fontFamily: FONTS.sans.bold, // Or a different Roboto weight/style
    fontSize: FONT_SIZES['3xl'],
    color: COLORS.textPrimary,
  },
  h2: {
    fontFamily: FONTS.sans.bold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.textPrimary,
  },
  // etc.
}); 