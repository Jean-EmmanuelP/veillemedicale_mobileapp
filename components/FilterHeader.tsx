import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import Modal from 'react-native-modal';
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
  const [showDisciplineModal, setShowDisciplineModal] = useState(false);
  const [showSubDisciplineModal, setShowSubDisciplineModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);

  const selectedDisciplineName = selectedDiscipline === 'all' 
    ? 'Toutes les disciplines' 
    : selectedDiscipline;
  
  const selectedSubDisciplineName = 
    !selectedSubDiscipline || selectedSubDiscipline === 'all' || !subDisciplines || subDisciplines.length === 0
      ? 'Toutes les sous-disciplines' 
      : selectedSubDiscipline;

  const selectedGradeLabel = gradeOptions.find(g => g.value === selectedGrade)?.label || 'Tous les grades';

  const canShowSubDisciplines = selectedDiscipline !== 'all' && subDisciplines && subDisciplines.length > 0;

  const renderDisciplineModal = () => (
    <Modal
      isVisible={showDisciplineModal}
      style={styles.modalContainer}
      onBackdropPress={() => setShowDisciplineModal(false)}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      useNativeDriverForBackdrop
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Disciplines</Text>
          <TouchableOpacity onPress={() => setShowDisciplineModal(false)}>
            <Ionicons name="close" size={24} color={COLORS.iconPrimary} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={disciplines}
          keyExtractor={(item) => `discipline-${item}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                onDisciplineChange(item);
                setShowDisciplineModal(false);
              }}
            >
              <Text style={[
                styles.modalItemText,
                selectedDiscipline === item && styles.modalItemTextSelected
              ]}>{item === 'all' ? 'Toutes les disciplines' : item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );

  const renderSubDisciplineModal = () => (
    <Modal
      isVisible={showSubDisciplineModal}
      style={styles.modalContainer}
      onBackdropPress={() => setShowSubDisciplineModal(false)}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      useNativeDriverForBackdrop
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Sous-disciplines</Text>
          <TouchableOpacity onPress={() => setShowSubDisciplineModal(false)}>
            <Ionicons name="close" size={24} color={COLORS.iconPrimary} />
          </TouchableOpacity>
        </View>
        {loadingSubDisciplines ? (
          <ActivityIndicator size="large" color={COLORS.iconPrimary} style={{marginVertical: 20}}/>
        ) : (
          <FlatList
            data={['all', ...(subDisciplines || []).filter(sd => sd !== 'all')]}
            keyExtractor={(item) => `subdiscipline-${item}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  onSubDisciplineChange(item);
                  setShowSubDisciplineModal(false);
                }}
              >
                <Text style={[
                  styles.modalItemText,
                  selectedSubDiscipline === item && styles.modalItemTextSelected
                ]}>{item === 'all' ? 'Toutes les sous-disciplines' : item}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );

  const renderGradeModal = () => (
    <Modal
      isVisible={showGradeModal}
      style={styles.modalContainer}
      onBackdropPress={() => setShowGradeModal(false)}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      useNativeDriverForBackdrop
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Grades</Text>
          <TouchableOpacity onPress={() => setShowGradeModal(false)}>
            <Ionicons name="close" size={24} color={COLORS.iconPrimary} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={gradeOptions}
          keyExtractor={(item) => `grade-${item.value}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                onGradeChange(item.value);
                setShowGradeModal(false);
              }}
            >
              <Text style={[
                styles.modalItemText,
                selectedGrade === item.value && styles.modalItemTextSelected
              ]}>{item.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowDisciplineModal(true)}
        >
          <Text style={styles.filterButtonText} numberOfLines={1}>{selectedDisciplineName}</Text>
          <Ionicons name="chevron-down" size={20} color={COLORS.iconSecondary} />
        </TouchableOpacity>

        {selectedDiscipline !== 'all' && (
          <TouchableOpacity
            style={[styles.filterButton, (!subDisciplines || subDisciplines.length === 0) && !loadingSubDisciplines && styles.filterButtonDisabled]}
            onPress={() => {
              if (canShowSubDisciplines || loadingSubDisciplines) {
                setShowSubDisciplineModal(true);
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
          onPress={() => setShowGradeModal(true)}
        >
          <Text style={styles.filterButtonText} numberOfLines={1}>{selectedGradeLabel}</Text>
          <Ionicons name="chevron-down" size={20} color={COLORS.iconSecondary} />
        </TouchableOpacity>
      </View>

      {renderDisciplineModal()}
      {renderSubDisciplineModal()} 
      {renderGradeModal()}
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
  modalContainer: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    backgroundColor: COLORS.backgroundModal,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    maxHeight: '60%',
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