import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '../assets/constants/fonts';

interface TermsAcceptanceSectionProps {
  accepted: boolean;
  onToggle: (accepted: boolean) => void;
  termsText?: string;
  termsLinkText?: string;
  privacyLinkText?: string;
  andText?: string;
  asterisk?: string;
  termsRoute?: string;
  privacyRoute?: string;
}

export default function TermsAcceptanceSection({
  accepted,
  onToggle,
  termsText = "J'ai pris connaissance et j'accepte les ",
  termsLinkText = "conditions générales d'utilisation",
  privacyLinkText = "politique de confidentialité.",
  andText = " et la ",
  asterisk = "*",
  termsRoute = "/(auth)/(legal)/terms-of-use",
  privacyRoute = "/(auth)/(legal)/privacy-policy"
}: TermsAcceptanceSectionProps) {
  const router = useRouter();

  return (
    <View style={styles.termsContainer}>
      <View style={styles.termsTextContainer}>
        <Text style={styles.termsText}>
          {termsText}
          <Text 
            style={styles.termsLink}
            onPress={() => router.push(termsRoute as any)}
          >
            {termsLinkText}
          </Text>
          {andText}
          <Text 
            style={styles.termsLink}
            onPress={() => router.push(privacyRoute as any)}
          >
            {privacyLinkText}
          </Text>
          {asterisk}
        </Text>
      </View>
      <TouchableOpacity onPress={() => onToggle(!accepted)}>
        <View
          style={[
            styles.checkbox,
            accepted && styles.checkboxSelected,
          ]}
        >
          {accepted && (
            <Ionicons name="checkmark" size={12} color="#fff" />
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  termsContainer: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderTopWidth: 0.3,
    borderBottomWidth: 0.3,
    borderColor: "#919191",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bdbbbb",
    justifyContent: "center",
    backgroundColor: "gray",
    alignItems: "center",
    marginRight: 10,
  },
  checkboxSelected: {
    backgroundColor: "#616060",
    borderColor: "#919191",
  },
  termsTextContainer: {
    flex: 1,
  },
  termsText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: FONTS.sans.regular,
  },
  termsLink: {
    color: "#2196F3",
  },
}); 