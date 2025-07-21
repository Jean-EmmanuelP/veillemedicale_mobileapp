import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { COLORS } from '../assets/constants/colors';
import { FONTS, FONT_SIZES } from '../assets/constants/fonts';

interface TopHeaderProps {
  title: string;
  onProfilePress?: () => void;
  onTitlePress?: () => void;
}

export default function TopHeader({ title, onProfilePress, onTitlePress }: TopHeaderProps) {
  const { profile } = useSelector((state: RootState) => state.profile);

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
    return <FontAwesome name="user" size={20} color={COLORS.iconPrimary} />;
  };

  const renderTitle = () => {
    if (onTitlePress) {
      return (
        <TouchableOpacity onPress={onTitlePress} activeOpacity={0.7} style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.title}>{title}</Text>
        </TouchableOpacity>
      );
    }
    return <Text style={styles.title}>{title}</Text>;
  };

  return (
    <BlurView intensity={40} tint="dark" style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity onPress={onProfilePress} style={styles.profileButton}>
          {renderAvatar()}
        </TouchableOpacity>
        
        {renderTitle()}
        
        <View style={styles.rightSpacer} />
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 10,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: 'rgba(24, 24, 24, 0.8)',
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.borderPrimary,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  profileButton: {
    padding: 4,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
  },
  avatarInitial: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: FONTS.sans.bold,
  },
  title: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    fontSize: FONT_SIZES.lg,
    textAlign: 'center',
    fontFamily: FONTS.sans.bold,
    textTransform: 'uppercase',
  },
  rightSpacer: {
    width: 40, // Same width as profile button to center the title
  },
}); 