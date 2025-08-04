import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../assets/constants/colors';
import { FONTS, FONT_SIZES } from '../assets/constants/fonts';
import { BlurView } from 'expo-blur';

interface GuestAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onGoToSettings: () => void;
  feature: string;
}

const { width, height } = Dimensions.get('window');

export default function GuestAccountModal({
  visible,
  onClose,
  onGoToSettings,
  feature,
}: GuestAccountModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        
        <View style={styles.modalContainer}>
          <View style={styles.modal}>
            {/* Header avec icône */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="lock-closed" size={32} color={COLORS.primary} />
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Contenu principal */}
            <View style={styles.content}>
              <Text style={styles.title}>Fonctionnalité réservée</Text>
              <Text style={styles.subtitle}>
                Pour accéder à "{feature}", vous devez créer un compte permanent
              </Text>
              
              <Text style={styles.description}>
                Créez votre compte en 2 minutes et débloquez toutes les fonctionnalités :
              </Text>

              <View style={styles.benefitsList}>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={styles.benefitText}>Sauvegarde de vos articles favoris</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={styles.benefitText}>Articles personnalisés selon vos spécialités</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={styles.benefitText}>Notifications de veille médicale</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={styles.benefitText}>Historique de lecture synchronisé</Text>
                </View>
              </View>
            </View>

            {/* Boutons d'action */}
            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={onGoToSettings}
                activeOpacity={0.8}
              >
                <Ionicons name="person-add" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.primaryButtonText}>Créer mon compte</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.secondaryButton} 
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryButtonText}>Plus tard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Plus opaque
  } as ViewStyle,
  modalContainer: {
    width: width * 0.9,
    maxWidth: 400,
    maxHeight: height * 0.8,
  } as ViewStyle,
  modal: {
    backgroundColor: COLORS.backgroundPrimary,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  } as ViewStyle,
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  content: {
    padding: 20,
    paddingTop: 10,
  } as ViewStyle,
  title: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  } as TextStyle,
  subtitle: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 20,
  } as TextStyle,
  description: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  } as TextStyle,
  benefitsList: {
    marginBottom: 20,
  } as ViewStyle,
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 10,
  } as ViewStyle,
  benefitText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
    marginLeft: 12,
    flex: 1,
  } as TextStyle,
  actions: {
    padding: 20,
    paddingTop: 0,
  } as ViewStyle,
  primaryButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,
  buttonIcon: {
    marginRight: 8,
  } as ViewStyle,
  primaryButtonText: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  } as TextStyle,
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderPrimary,
    alignItems: 'center',
  } as ViewStyle,
  secondaryButtonText: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  } as TextStyle,
}); 