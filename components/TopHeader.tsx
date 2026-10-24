import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../store/hooks';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../assets/design-system';

interface TopHeaderProps {
  title: string;
  showProfileButton?: boolean;
}

export default function TopHeader({ title, showProfileButton = true }: TopHeaderProps) {
  const router = useRouter();
  const { isAnonymous } = useAppSelector((state) => state.auth);

  const handleProfilePress = () => {
    router.push('/profile');
  };

  const handleSearchPress = () => {
    router.push('/search');
  };

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerContent}>
        <Text style={styles.title}>{title}</Text>

        <View style={styles.rightButtons}>
          <Pressable
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.iconButtonPressed,
            ]}
            onPress={handleSearchPress}
          >
            <Ionicons name="search-outline" size={24} color={COLORS.icon.primary} />
          </Pressable>

          {showProfileButton && (
            <>
              {isAnonymous ? (
                // Bouton "Créer un compte" pour les utilisateurs anonymes
                <Pressable
                  style={({ pressed }) => [
                    styles.createAccountButton,
                    pressed && styles.createAccountButtonPressed,
                  ]}
                  onPress={handleProfilePress}
                >
                  <Ionicons name="person-add-outline" size={16} color={COLORS.text.white} />
                  <Text style={styles.createAccountText}>Créer un compte</Text>
                </Pressable>
              ) : (
                // Icône de profil pour les utilisateurs connectés
                <Pressable
                  style={({ pressed }) => [
                    styles.iconButton,
                    pressed && styles.iconButtonPressed,
                  ]}
                  onPress={handleProfilePress}
                >
                  <Ionicons name="person-circle-outline" size={28} color={COLORS.icon.primary} />
                </Pressable>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 12,
    backgroundColor: COLORS.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.heading.h2,
    color: COLORS.text.primary,
    flex: 1,
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconButton: {
    padding: SPACING.xs,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
  },
  iconButtonPressed: {
    backgroundColor: COLORS.interaction.pressed,
  },
  createAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
    ...SHADOWS.button,
  },
  createAccountButtonPressed: {
    backgroundColor: COLORS.primary.dark,
  },
  createAccountText: {
    ...TYPOGRAPHY.label.small,
    color: COLORS.text.white,
    fontWeight: '600',
  },
});
