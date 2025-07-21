import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { RootState } from '../store';
import { COLORS } from '../assets/constants/colors';
import { FONTS, FONT_SIZES } from '../assets/constants/fonts';

interface TopHeaderProps {
  title: string;
}

export default function TopHeader({ title }: TopHeaderProps) {
  const router = useRouter();
  const { profile } = useSelector((state: RootState) => state.profile);

  const handleSettingsPress = () => {
    router.push('/profile');
  };

  const renderAvatar = () => {
    if (profile?.first_name) {
      return (
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>
            {profile.first_name.charAt(0).toUpperCase()}
          </Text>
        </View>
      );
    }
    return <FontAwesome name="user" size={18} color={COLORS.iconPrimary} />;
  };

  return (
    <BlurView intensity={0} tint="dark" style={styles.container}>
      <View style={styles.content}>
        <View style={styles.leftSpacer} />
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
        </View>
        
        <TouchableOpacity onPress={handleSettingsPress} style={styles.settingsButton}>
          {renderAvatar()}
        </TouchableOpacity>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 44 : 16,
    paddingBottom: 8,
    backgroundColor: 'black',
    overflow: 'hidden',
    marginBottom: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  leftSpacer: {
    width: 32,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  settingsButton: {
    padding: 2,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
  },
  avatarInitial: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: FONTS.sans.bold,
  },
  title: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    fontSize: FONT_SIZES.base,
    textAlign: 'center',
    fontFamily: FONTS.sans.bold,
    textTransform: 'uppercase',
  },
}); 