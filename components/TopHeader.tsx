import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../store/hooks';
import { COLORS } from '../assets/constants/colors';
import { FONTS, FONT_SIZES } from '../assets/constants/fonts';
import { BlurView } from 'expo-blur';

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

  return (
    <BlurView intensity={0} tint="dark" style={styles.headerContainer}>
      <View style={styles.headerContent}>
        <Text style={styles.title}>{title}</Text>
        
        {showProfileButton && (
          <>
            {isAnonymous ? (
              // Bouton "Créer un compte" pour les utilisateurs anonymes
              <TouchableOpacity 
                style={styles.createAccountButton} 
                onPress={handleProfilePress}
                activeOpacity={0.8}
              >
                <Ionicons name="person-add" size={16} color="#FFFFFF" />
                <Text style={styles.createAccountText}>Créer un compte</Text>
              </TouchableOpacity>
            ) : (
              // Icône de profil pour les utilisateurs connectés
              <TouchableOpacity style={styles.profileButton} onPress={handleProfilePress}>
                <Ionicons name="person-circle" size={28} color={COLORS.iconPrimary} />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 10,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: 'black',
    overflow: 'hidden',
  } as ViewStyle,
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  } as ViewStyle,
  title: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.sans?.bold || FONTS.bold,
    textTransform: 'uppercase',
    flex: 1,
  } as TextStyle,
  profileButton: {
    padding: 4,
  } as ViewStyle,
  createAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  } as ViewStyle,
  createAccountText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    marginLeft: 6,
  } as TextStyle,
}); 