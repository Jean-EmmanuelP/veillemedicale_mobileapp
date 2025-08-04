import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { FONTS, FONT_SIZES } from '../assets/constants/fonts';
import { COLORS } from '../assets/constants/colors';

type FilterType = 'all' | 'articles' | 'recommandations';

interface ToggleFilterProps {
  filterType: FilterType;
  onFilterChange: (filterType: FilterType) => void;
  style?: ViewStyle;
}

const ToggleFilter: React.FC<ToggleFilterProps> = ({
  filterType,
  onFilterChange,
  style,
}) => {
  const filters = [
    { key: 'all' as FilterType, label: 'Tous' },
    { key: 'articles' as FilterType, label: 'Articles' },
    { key: 'recommandations' as FilterType, label: 'Recommandations' },
  ];

  return (
    <View style={[styles.container, style]}>
      {filters.map((filter) => (
        <TouchableOpacity
          key={filter.key}
          style={[
            styles.toggleButton,
            filterType === filter.key && styles.toggleButtonActive
          ]}
          onPress={() => onFilterChange(filter.key)}
        >
          <Text
            style={[
              styles.toggleButtonText,
              filterType === filter.key && styles.toggleButtonTextActive
            ]}
          >
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
  } as ViewStyle,
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderPrimary,
    marginHorizontal: 4,
    backgroundColor: COLORS.backgroundSecondary,
  } as ViewStyle,
  toggleButtonActive: {
    backgroundColor: COLORS.buttonBackgroundPrimary,
    borderColor: COLORS.buttonBackgroundPrimary,
  } as ViewStyle,
  toggleButtonText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.medium,
    color: COLORS.textSecondary,
  } as TextStyle,
  toggleButtonTextActive: {
    color: COLORS.textOnPrimaryButton,
  } as TextStyle,
});

export default ToggleFilter; 