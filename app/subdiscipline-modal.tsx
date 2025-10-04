import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../assets/constants/colors';
import { FONTS, FONT_SIZES } from '../assets/constants/fonts';
import { useAppDispatch } from '../store/hooks';
import { setSelectedSubDiscipline } from '../store/articlesSlice';

export default function SubDisciplineModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const dispatch = useAppDispatch();

  const subDisciplines = params.subDisciplines ? JSON.parse(params.subDisciplines as string) : [];
  const selected = params.selected as string;
  const loading = params.loading === 'true';

  const handleSelect = (subDiscipline: string) => {
    dispatch(setSelectedSubDiscipline(subDiscipline));
    router.back();
  };

  const data = ['all', ...subDisciplines.filter((sd: string) => sd !== 'all')];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sous-disciplines</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={COLORS.iconPrimary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.iconPrimary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : (
        <FlatList
          data={data}
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
                {item === 'all' ? 'Sous-disciplines' : item}
              </Text>
              {selected === item && (
                <Ionicons name="checkmark-circle" size={24} color={COLORS.buttonBackgroundPrimary} />
              )}
            </TouchableOpacity>
          )}
        />
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textSecondary,
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
