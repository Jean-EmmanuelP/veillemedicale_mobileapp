import React, { useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { FONTS } from '../assets/constants/fonts';

export interface NotificationOption {
  value: string;
  label: string;
}

interface NotificationFrequencySelectorProps {
  value: string;
  options: NotificationOption[];
  onValueChange: (value: string) => void;
  title?: string;
  placeholder?: string;
}

export default function NotificationFrequencySelector({
  value,
  options,
  onValueChange,
  title = "Fréquence de notification",
  placeholder = "Sélectionner une fréquence"
}: NotificationFrequencySelectorProps) {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  const selectedOption = options.find(opt => opt.value === value);

  const snapPoints = useMemo(() => ['60%'], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const handlePresentModalPress = useCallback(() => {
    bottomSheetModalRef.current?.present();
  }, []);

  const handleSelect = useCallback((selectedValue: string) => {
    onValueChange(selectedValue);
    bottomSheetModalRef.current?.close();
  }, [onValueChange]);

  const renderItem = useCallback(({ item }: { item: NotificationOption }) => (
    <TouchableOpacity
      style={[
        styles.modalOption,
        value === item.value && styles.modalOptionSelected
      ]}
      onPress={() => handleSelect(item.value)}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.modalOptionText,
        value === item.value && styles.modalOptionTextSelected
      ]}>
        {item.label}
      </Text>
      {value === item.value && (
        <MaterialIcons name="check" size={20} color="#2196F3" />
      )}
    </TouchableOpacity>
  ), [value, handleSelect]);

  return (
    <>
      <TouchableOpacity 
        style={styles.toggleOption}
        onPress={handlePresentModalPress}
      >
        <Text style={styles.toggleLabel}>{title}</Text>
        <View style={styles.toggleValueContainer}>
          <Text style={styles.toggleValue}>
            {selectedOption?.label || placeholder}
          </Text>
          <MaterialIcons name="keyboard-arrow-right" size={20} color="#919191" />
        </View>
      </TouchableOpacity>

      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.modalBackground}
        handleIndicatorStyle={styles.handleIndicator}
        handleStyle={styles.handleStyle}
      >
        <BottomSheetView style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={() => bottomSheetModalRef.current?.close()}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </BottomSheetView>
        
        <BottomSheetFlatList
          data={options}
          keyExtractor={(item) => item.value}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  toggleOption: {
    backgroundColor: "#000",
    borderRadius: 15,
    borderWidth: 0.5,
    borderColor: "#919191",
    paddingVertical: 15,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  toggleLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 5,
  },
  toggleValueContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  modalBackground: {
    backgroundColor: "#111",
  },
  handleStyle: {
    backgroundColor: "#111",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    backgroundColor: "#919191",
    width: 40,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingTop: 10,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: FONTS.sans.regular,
  },
  listContainer: {
    paddingBottom: 20,
  },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: "#000",
    borderWidth: 0.5,
    borderColor: "#919191",
  },
  modalOptionSelected: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
  },
  modalOptionText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    fontFamily: FONTS.sans.regular,
  },
  modalOptionTextSelected: {
    color: "#fff",
  },
}); 