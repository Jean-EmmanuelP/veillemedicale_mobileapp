import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../assets/design-system';

interface FilterHeaderProps {
  disciplines: string[];        // Main discipline names
  subDisciplines?: string[];     // Optional: Sub-discipline names for selected main discipline
  selectedDiscipline: string;   // Currently selected main discipline name
  selectedSubDiscipline: string | null; // Currently selected sub-discipline name
  selectedGrade: string | null;   // Selected grade
  onDisciplineChange: (discipline: string) => void;
  onSubDisciplineChange: (subDiscipline: string | null) => void;
  onGradeChange: (grade: string | null) => void;
  loadingSubDisciplines?: boolean; // Optional: To show loading for sub-disciplines
}

const gradeOptions = [
  { value: null, label: 'Grades' },
  { value: 'A', label: 'Grade A' },
  { value: 'B', label: 'Grade B' },
  { value: 'C', label: 'Grade C' },
];

export default function FilterHeader({
  disciplines,
  subDisciplines,
  selectedDiscipline,
  selectedSubDiscipline,
  selectedGrade,
  onDisciplineChange,
  onSubDisciplineChange,
  onGradeChange,
  loadingSubDisciplines,
}: FilterHeaderProps) {
  const router = useRouter();

  const selectedDisciplineName = selectedDiscipline === 'all'
    ? 'Toutes les disciplines'
    : selectedDiscipline;

  const selectedSubDisciplineName =
    !selectedSubDiscipline || selectedSubDiscipline === 'all' || !subDisciplines || subDisciplines.length === 0
      ? 'Sous-disciplines'
      : selectedSubDiscipline;

  const selectedGradeLabel = gradeOptions.find(g => g.value === selectedGrade)?.label || 'Grades';

  const canShowSubDisciplines = selectedDiscipline !== 'all' && subDisciplines && subDisciplines.length > 0;

  const handleDisciplinePress = () => {
    router.push({
      pathname: '/discipline-modal',
      params: {
        disciplines: JSON.stringify(disciplines),
        selected: selectedDiscipline,
      },
    });
  };

  const handleSubDisciplinePress = () => {
    if (canShowSubDisciplines || loadingSubDisciplines) {
      router.push({
        pathname: '/subdiscipline-modal',
        params: {
          subDisciplines: JSON.stringify(subDisciplines || []),
          selected: selectedSubDiscipline || 'all',
          loading: loadingSubDisciplines ? 'true' : 'false',
        },
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.filterContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.filterButton,
            pressed && styles.filterButtonPressed,
          ]}
          onPress={handleDisciplinePress}
        >
          <Text style={styles.filterButtonText} numberOfLines={1}>{selectedDisciplineName}</Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.icon.secondary} />
        </Pressable>

        {selectedDiscipline !== 'all' && (
          <Pressable
            style={({ pressed }) => [
              styles.filterButton,
              (!subDisciplines || subDisciplines.length === 0) && !loadingSubDisciplines && styles.filterButtonDisabled,
              pressed && canShowSubDisciplines && styles.filterButtonPressed,
            ]}
            onPress={handleSubDisciplinePress}
            disabled={!canShowSubDisciplines && !loadingSubDisciplines}
          >
            {loadingSubDisciplines ? (
              <ActivityIndicator size="small" color={COLORS.primary.main} />
            ) : (
              <Text style={styles.filterButtonText} numberOfLines={1}>{selectedSubDisciplineName}</Text>
            )}
            <Ionicons name="chevron-down" size={16} color={COLORS.icon.secondary} />
          </Pressable>
        )}
      </View>

      <View style={styles.gradeSection}>
        <View style={styles.gradeLabelRow}>
          <Text style={styles.gradeLabel}>Grade</Text>
          <Text style={styles.gradeDescription}>
            {selectedGrade === 'A' && 'A uniquement'}
            {selectedGrade === 'B' && 'A + B'}
            {selectedGrade === 'C' && 'Tous (A, B, C)'}
            {selectedGrade === null && 'Tous les grades'}
          </Text>
        </View>
        <View style={styles.gradeSliderContainer}>
          <View style={styles.gradeLine} />

          <Pressable
            style={({ pressed }) => [
              styles.gradePoint,
              selectedGrade === 'A' && styles.gradePointSelected,
              pressed && styles.gradePointPressed,
            ]}
            onPress={() => onGradeChange('A')}
          >
            <Text style={[styles.gradePointText, selectedGrade === 'A' && styles.gradePointTextSelected]}>A</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.gradePoint,
              selectedGrade === 'B' && styles.gradePointSelected,
              pressed && styles.gradePointPressed,
            ]}
            onPress={() => onGradeChange('B')}
          >
            <Text style={[styles.gradePointText, selectedGrade === 'B' && styles.gradePointTextSelected]}>B</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.gradePoint,
              selectedGrade === 'C' && styles.gradePointSelected,
              pressed && styles.gradePointPressed,
            ]}
            onPress={() => onGradeChange('C')}
          >
            <Text style={[styles.gradePointText, selectedGrade === 'C' && styles.gradePointTextSelected]}>C</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.gradePoint,
              styles.gradePointAll,
              selectedGrade === null && styles.gradePointSelected,
              pressed && styles.gradePointPressed,
            ]}
            onPress={() => onGradeChange(null)}
          >
            <Text style={[styles.gradePointText, selectedGrade === null && styles.gradePointTextSelected]}>Tous</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background.primary,
    paddingTop: Platform.OS === 'ios' ? 0 : 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.xs,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background.secondary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    minWidth: 80,
  },
  filterButtonPressed: {
    backgroundColor: COLORS.interaction.pressed,
  },
  filterButtonDisabled: {
    backgroundColor: COLORS.background.tertiary,
    opacity: 0.5,
  },
  filterButtonText: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.primary,
    flexShrink: 1,
    marginRight: SPACING.xs,
    fontWeight: '500',
  },
  gradeSection: {
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  gradeLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  gradeLabel: {
    ...TYPOGRAPHY.label.small,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  gradeDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  gradeSliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  gradeLine: {
    position: 'absolute',
    left: 28,
    right: 28,
    height: 2,
    backgroundColor: COLORS.border.medium,
    top: '50%',
    marginTop: -1,
  },
  gradePoint: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background.primary,
    borderWidth: 2,
    borderColor: COLORS.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  gradePointAll: {
    width: 48,
    borderRadius: RADIUS.md,
  },
  gradePointSelected: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.main,
  },
  gradePointPressed: {
    transform: [{ scale: 0.95 }],
  },
  gradePointText: {
    ...TYPOGRAPHY.label.small,
    color: COLORS.text.tertiary,
    fontWeight: '700',
  },
  gradePointTextSelected: {
    color: COLORS.text.white,
  },
});
