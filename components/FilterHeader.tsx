import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FONTS, FONT_SIZES } from '../assets/constants/fonts';
import { COLORS } from '../assets/constants/colors';

interface FilterHeaderProps {
  disciplines: string[];        // Main discipline names
  subDisciplines?: string[];     // Optional: Sub-discipline names for selected main discipline
  selectedDiscipline: string;   // Currently selected main discipline name
  selectedSubDiscipline: string | null; // Currently selected sub-discipline name
  selectedGrade: string | null;   // New prop for selected grade
  onDisciplineChange: (discipline: string) => void;
  onSubDisciplineChange: (subDiscipline: string | null) => void;
  onGradeChange: (grade: string | null) => void;   // New prop for grade change handler
  loadingSubDisciplines?: boolean; // Optional: To show loading for sub-disciplines
}

const gradeOptions = [
  { value: null, label: 'Grades' }, // Represents 'all grades'
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
        <TouchableOpacity
          style={styles.filterButton}
          onPress={handleDisciplinePress}
        >
          <Text style={styles.filterButtonText} numberOfLines={1}>{selectedDisciplineName}</Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.iconSecondary} />
        </TouchableOpacity>

        {selectedDiscipline !== 'all' && (
          <TouchableOpacity
            style={[styles.filterButton, (!subDisciplines || subDisciplines.length === 0) && !loadingSubDisciplines && styles.filterButtonDisabled]}
            onPress={handleSubDisciplinePress}
            disabled={!canShowSubDisciplines && !loadingSubDisciplines}
          >
            {loadingSubDisciplines ? (
              <ActivityIndicator size="small" color={COLORS.iconPrimary} />
            ) : (
              <Text style={styles.filterButtonText} numberOfLines={1}>{selectedSubDisciplineName}</Text>
            )}
            <Ionicons name="chevron-down" size={16} color={COLORS.iconSecondary} />
          </TouchableOpacity>
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

          <TouchableOpacity
            style={[styles.gradePoint, selectedGrade === 'A' && styles.gradePointSelected]}
            onPress={() => onGradeChange('A')}
          >
            <Text style={[styles.gradePointText, selectedGrade === 'A' && styles.gradePointTextSelected]}>A</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gradePoint, selectedGrade === 'B' && styles.gradePointSelected]}
            onPress={() => onGradeChange('B')}
          >
            <Text style={[styles.gradePointText, selectedGrade === 'B' && styles.gradePointTextSelected]}>B</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gradePoint, selectedGrade === 'C' && styles.gradePointSelected]}
            onPress={() => onGradeChange('C')}
          >
            <Text style={[styles.gradePointText, selectedGrade === 'C' && styles.gradePointTextSelected]}>C</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gradePoint, styles.gradePointAll, selectedGrade === null && styles.gradePointSelected]}
            onPress={() => onGradeChange(null)}
          >
            <Text style={[styles.gradePointText, selectedGrade === null && styles.gradePointTextSelected]}>Tous</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.backgroundPrimary,
    paddingTop: Platform.OS === 'ios' ? 0 : 10,
    paddingBottom: 10,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingBottom: 5,
    alignItems: 'center',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1C',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    minWidth: 80,
  },
  filterButtonDisabled: {
    backgroundColor: '#121212',
    opacity: 0.5,
  },
  filterButtonText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.sans.medium,
    color: COLORS.textPrimary,
    flexShrink: 1,
    marginRight: 4,
  },
  gradeSection: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 6,
  },
  gradeLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gradeLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.sans.medium,
    color: '#E0E0E0',
  },
  gradeDescription: {
    fontSize: 10,
    fontFamily: FONTS.sans.regular,
    color: '#757575',
  },
  gradeSliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  gradeLine: {
    position: 'absolute',
    left: 28,
    right: 28,
    height: 1.5,
    backgroundColor: '#424242',
    top: '50%',
    marginTop: -0.75,
  },
  gradePoint: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A1A1A',
    borderWidth: 1.5,
    borderColor: '#3A3A3A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  gradePointAll: {
    width: 48,
    borderRadius: 10,
  },
  gradePointSelected: {
    backgroundColor: '#2962FF',
    borderColor: '#448AFF',
    borderWidth: 2,
  },
  gradePointText: {
    fontSize: 11,
    fontFamily: FONTS.sans.bold,
    color: '#757575',
  },
  gradePointTextSelected: {
    color: '#FFFFFF',
  },
}); 