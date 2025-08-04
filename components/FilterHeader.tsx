import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetFlatList,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
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
  { value: null, label: 'Tous les grades' }, // Represents 'all grades'
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
  const disciplineModalRef = useRef<BottomSheetModal>(null);
  const subDisciplineModalRef = useRef<BottomSheetModal>(null);
  const gradeModalRef = useRef<BottomSheetModal>(null);

  const snapPoints = useMemo(() => ['80%'], []);

  const selectedDisciplineName = selectedDiscipline === 'all' 
    ? 'Toutes les disciplines' 
    : selectedDiscipline;
  
  const selectedSubDisciplineName = 
    !selectedSubDiscipline || selectedSubDiscipline === 'all' || !subDisciplines || subDisciplines.length === 0
      ? 'Toutes les sous-disciplines' 
      : selectedSubDiscipline;

  const selectedGradeLabel = gradeOptions.find(g => g.value === selectedGrade)?.label || 'Tous les grades';

  const canShowSubDisciplines = selectedDiscipline !== 'all' && subDisciplines && subDisciplines.length > 0;

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    []
  );

  const handleDisciplineSelect = useCallback((item: string) => {
    setTimeout(() => {
      if (selectedDiscipline !== item) {
        onDisciplineChange(item);
      }
      disciplineModalRef.current?.dismiss();
    }, 100);
  }, [selectedDiscipline, onDisciplineChange]);

  const handleSubDisciplineSelect = useCallback((item: string) => {
    setTimeout(() => {
      if (selectedSubDiscipline !== item) {
        onSubDisciplineChange(item);
      }
      subDisciplineModalRef.current?.dismiss();
    }, 100);
  }, [selectedSubDiscipline, onSubDisciplineChange]);

  const handleGradeSelect = useCallback((item: { value: string | null; label: string }) => {
    setTimeout(() => {
      if (selectedGrade !== item.value) {
        onGradeChange(item.value);
      }
      gradeModalRef.current?.dismiss();
    }, 100);
  }, [selectedGrade, onGradeChange]);

  const renderDisciplineItem = useCallback(({ item }: { item: string }) => (
            <TouchableOpacity
              style={styles.modalItem}
      onPress={() => handleDisciplineSelect(item)}
            >
              <Text style={[
                styles.modalItemText,
                selectedDiscipline === item && styles.modalItemTextSelected
              ]}>{item === 'all' ? 'Toutes les disciplines' : item}</Text>
            </TouchableOpacity>
  ), [selectedDiscipline, handleDisciplineSelect]);

  const renderSubDisciplineItem = useCallback(({ item }: { item: string }) => (
              <TouchableOpacity
                style={styles.modalItem}
      onPress={() => handleSubDisciplineSelect(item)}
              >
                <Text style={[
                  styles.modalItemText,
                  selectedSubDiscipline === item && styles.modalItemTextSelected
                ]}>{item === 'all' ? 'Toutes les sous-disciplines' : item}</Text>
              </TouchableOpacity>
  ), [selectedSubDiscipline, handleSubDisciplineSelect]);

  const renderGradeItem = useCallback(({ item }: { item: { value: string | null; label: string } }) => (
            <TouchableOpacity
              style={styles.modalItem}
      onPress={() => handleGradeSelect(item)}
            >
              <Text style={[
                styles.modalItemText,
                selectedGrade === item.value && styles.modalItemTextSelected
              ]}>{item.label}</Text>
            </TouchableOpacity>
  ), [selectedGrade, handleGradeSelect]);

  const subDisciplineData = useMemo(() => 
    ['all', ...(subDisciplines || []).filter(sd => sd !== 'all')], 
    [subDisciplines]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => disciplineModalRef.current?.present()}
        >
          <Text style={styles.filterButtonText} numberOfLines={1}>{selectedDisciplineName}</Text>
          <Ionicons name="chevron-down" size={20} color={COLORS.iconSecondary} />
        </TouchableOpacity>

        {selectedDiscipline !== 'all' && (
          <TouchableOpacity
            style={[styles.filterButton, (!subDisciplines || subDisciplines.length === 0) && !loadingSubDisciplines && styles.filterButtonDisabled]}
            onPress={() => {
              if (canShowSubDisciplines || loadingSubDisciplines) {
                subDisciplineModalRef.current?.present();
              }
            }}
            disabled={!canShowSubDisciplines && !loadingSubDisciplines}
          >
            {loadingSubDisciplines ? (
              <ActivityIndicator size="small" color={COLORS.iconPrimary} />
            ) : (
              <Text style={styles.filterButtonText} numberOfLines={1}>{selectedSubDisciplineName}</Text>
            )}
            <Ionicons name="chevron-down" size={20} color={COLORS.iconSecondary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => gradeModalRef.current?.present()}
        >
          <Text style={styles.filterButtonText} numberOfLines={1}>{selectedGradeLabel}</Text>
          <Ionicons name="chevron-down" size={20} color={COLORS.iconSecondary} />
        </TouchableOpacity>
      </View>

      {/* Discipline Modal */}
      <BottomSheetModal
        ref={disciplineModalRef}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetView style={styles.modalInnerContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Disciplines</Text>
            <TouchableOpacity onPress={() => disciplineModalRef.current?.dismiss()}>
              <Ionicons name="close" size={24} color={COLORS.iconPrimary} />
            </TouchableOpacity>
          </View>
          <BottomSheetFlatList
            data={disciplines}
            keyExtractor={(item) => `discipline-${item}`}
            renderItem={renderDisciplineItem}
            contentContainerStyle={styles.modalScrollView}
          />
        </BottomSheetView>
      </BottomSheetModal>

      {/* Sub-discipline Modal */}
      <BottomSheetModal
        ref={subDisciplineModalRef}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetView style={styles.modalInnerContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sous-disciplines</Text>
            <TouchableOpacity onPress={() => subDisciplineModalRef.current?.dismiss()}>
              <Ionicons name="close" size={24} color={COLORS.iconPrimary} />
            </TouchableOpacity>
          </View>
          {loadingSubDisciplines ? (
            <ActivityIndicator size="large" color={COLORS.iconPrimary} style={{marginVertical: 20}}/>
          ) : (
            <BottomSheetFlatList
              data={subDisciplineData}
              keyExtractor={(item) => `subdiscipline-${item}`}
              renderItem={renderSubDisciplineItem}
              contentContainerStyle={styles.modalScrollView}
            />
          )}
        </BottomSheetView>
      </BottomSheetModal>

      {/* Grade Modal */}
      <BottomSheetModal
        ref={gradeModalRef}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetView style={styles.modalInnerContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Grades</Text>
            <TouchableOpacity onPress={() => gradeModalRef.current?.dismiss()}>
              <Ionicons name="close" size={24} color={COLORS.iconPrimary} />
            </TouchableOpacity>
          </View>
          <BottomSheetFlatList
            data={gradeOptions}
            keyExtractor={(item) => `grade-${item.value}`}
            renderItem={renderGradeItem}
            contentContainerStyle={styles.modalScrollView}
          />
        </BottomSheetView>
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.backgroundPrimary, // White background
    paddingTop: Platform.OS === 'ios' ? 0 : 10, // Adjusted padding
    paddingBottom: 10,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 5,
    paddingBottom: 10,
    alignItems: 'center',
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundPrimary, // White background
    paddingVertical: 10, // Increased padding
    paddingHorizontal: 8, // Increased padding
    borderRadius: 8, // Smoother radius
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: COLORS.borderPrimary, // Light gray border
    minWidth: 80, // Added minWidth
  },
  filterButtonDisabled: {
    backgroundColor: COLORS.backgroundSecondary, // Disabled look
    opacity: 0.7,
  },
  filterButtonText: {
    fontSize: FONT_SIZES.sm, // Using FONT_SIZES constant
    fontFamily: FONTS.sans.regular, // Explicitly set font family
    color: COLORS.textPrimary, // Darker text
    flexShrink: 1, // Allow text to shrink if needed
    marginRight: 4, // Space before icon
  },
  modalInnerContainer: {
    backgroundColor: COLORS.backgroundModal,
    flex: 1,
  },
  modalScrollView: {
    flexGrow: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderPrimary,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.sans.bold,
    color: COLORS.textPrimary,
  },
  modalItem: {
    paddingVertical: 16,
    paddingHorizontal: 10,
  },
  modalItemText: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textPrimary,
  },
  modalItemTextSelected: {
    fontFamily: FONTS.sans.bold,
    color: COLORS.textPrimary,
  },
}); 