import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../assets/constants/colors';
import { FONTS, FONT_SIZES } from '../assets/constants/fonts';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ModernDatePickerProps {
  visible: boolean;
  onClose: () => void;
  onDateSelect: (date: string) => void; // Format YYYY-MM-DD
  initialDate?: string;
  title?: string;
}

const ModernDatePicker: React.FC<ModernDatePickerProps> = ({
  visible,
  onClose,
  onDateSelect,
  initialDate,
  title = "Anniversaire 🎉",
}) => {
  const [displayDate, setDisplayDate] = useState(
    initialDate ? formatDisplayDate(initialDate) : ''
  );

  // Convert YYYY-MM-DD to DD/MM/YYYY for display
  function formatDisplayDate(dateString: string): string {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  }

  // Convert DD/MM/YYYY to YYYY-MM-DD for backend
  function formatBackendDate(displayDate: string): string {
    if (!displayDate || displayDate.length !== 10) return '';
    const [day, month, year] = displayDate.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const handleNumberPress = (number: string) => {
    const currentDigits = displayDate.replace(/\//g, '');
    
    if (currentDigits.length < 8) {
      const newDigits = currentDigits + number;
      let formatted = '';
      
      // Format as DD/MM/YYYY
      if (newDigits.length >= 1) formatted += newDigits.substring(0, 2);
      if (newDigits.length >= 3) formatted += '/' + newDigits.substring(2, 4);
      if (newDigits.length >= 5) formatted += '/' + newDigits.substring(4, 8);
      
      setDisplayDate(formatted);
    }
  };

  const handleBackspace = () => {
    const currentDigits = displayDate.replace(/\//g, '');
    if (currentDigits.length > 0) {
      const newDigits = currentDigits.slice(0, -1);
      let formatted = '';
      
      if (newDigits.length >= 1) formatted += newDigits.substring(0, 2);
      if (newDigits.length >= 3) formatted += '/' + newDigits.substring(2, 4);
      if (newDigits.length >= 5) formatted += '/' + newDigits.substring(4, 8);
      
      setDisplayDate(formatted);
    }
  };

  const handleSave = () => {
    const backendDate = formatBackendDate(displayDate);
    if (backendDate && isValidDate(displayDate)) {
      onDateSelect(backendDate);
      onClose();
    }
  };

  const isValidDate = (dateStr: string): boolean => {
    if (dateStr.length !== 10) return false;
    const [day, month, year] = dateStr.split('/').map(Number);
    
    if (day < 1 || day > 31) return false;
    if (month < 1 || month > 12) return false;
    if (year < 1900 || year > new Date().getFullYear()) return false;
    
    return true;
  };

  const keypadNumbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'backspace']
  ];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>Utilisé pour vérifier ton âge.</Text>
          </View>

          {/* Date Display */}
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>
              {displayDate || 'DD/MM/YYYY'}
            </Text>
            <TouchableOpacity 
              style={[
                styles.saveButton,
                (!displayDate || !isValidDate(displayDate)) && styles.saveButtonDisabled
              ]}
              onPress={handleSave}
              disabled={!displayDate || !isValidDate(displayDate)}
            >
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>

          {/* Keypad */}
          <View style={styles.keypad}>
            {keypadNumbers.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.keypadRow}>
                {row.map((key, keyIndex) => (
                  <TouchableOpacity
                    key={keyIndex}
                    style={[
                      styles.keypadButton,
                      key === '' && styles.keypadButtonEmpty
                    ]}
                    onPress={() => {
                      if (key === 'backspace') {
                        handleBackspace();
                      } else if (key !== '') {
                        handleNumberPress(key);
                      }
                    }}
                    disabled={key === ''}
                  >
                    {key === 'backspace' ? (
                      <Ionicons name="backspace" size={24} color={COLORS.textPrimary} />
                    ) : key !== '' ? (
                      <View style={styles.keypadContent}>
                        <Text style={styles.keypadNumber}>{key}</Text>
                        <Text style={styles.keypadLetters}>
                          {key === '2' && 'ABC'}
                          {key === '3' && 'DEF'}
                          {key === '4' && 'GHI'}
                          {key === '5' && 'JKL'}
                          {key === '6' && 'MNO'}
                          {key === '7' && 'PQRS'}
                          {key === '8' && 'TUV'}
                          {key === '9' && 'WXYZ'}
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>

          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Annuler</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.backgroundPrimary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    minHeight: screenHeight * 0.7,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.sans.bold,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textSecondary,
  },
  dateContainer: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.sans.bold,
    color: COLORS.textPrimary,
    letterSpacing: 2,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
    opacity: 0.5,
  },
  saveButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.sans.medium,
    fontSize: FONT_SIZES.sm,
  },
  keypad: {
    flex: 1,
    maxHeight: 300,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  keypadButton: {
    width: (screenWidth - 80) / 3,
    height: 60,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadButtonEmpty: {
    backgroundColor: 'transparent',
  },
  keypadContent: {
    alignItems: 'center',
  },
  keypadNumber: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.sans.bold,
    color: COLORS.textPrimary,
  },
  keypadLetters: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.medium,
    color: COLORS.textSecondary,
  },
});

export default ModernDatePicker; 