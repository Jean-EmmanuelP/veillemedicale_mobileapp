import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../assets/constants/colors';
import { FONTS, FONT_SIZES } from '../assets/constants/fonts';
import { useAppDispatch } from '../store/hooks';
import { setSelectedDiscipline } from '../store/articlesSlice';

export default function DisciplineModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const dispatch = useAppDispatch();

  const disciplines = params.disciplines ? JSON.parse(params.disciplines as string) : [];
  const selected = params.selected as string;

  const handleSelect = (discipline: string) => {
    dispatch(setSelectedDiscipline(discipline));
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Disciplines</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={COLORS.iconPrimary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={disciplines}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => handleSelect(item)}
          >
            <Text style={[
              styles.itemText,
              selected === item && styles.itemTextSelected
            ]}>
              {item === 'all' ? 'Toutes les disciplines' : item}
            </Text>
            {selected === item && (
              <Ionicons name="checkmark-circle" size={24} color={COLORS.buttonBackgroundPrimary} />
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundModal,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderPrimary,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.sans.bold,
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.borderPrimary,
  },
  itemText: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textPrimary,
    flex: 1,
  },
  itemTextSelected: {
    fontFamily: FONTS.sans.bold,
    color: COLORS.buttonBackgroundPrimary,
  },
});
