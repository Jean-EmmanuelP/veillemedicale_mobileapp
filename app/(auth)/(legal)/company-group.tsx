import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { FONTS } from '../../../assets/constants/fonts';

// i18n strings - will be moved to proper i18n later
const strings = {
  title: "Explication sur le Traitement des Données",
  lastUpdated: "Date : 26 juillet 2025",
  content: {
    greeting: "Chers Utilisateurs,",
    intro: "L'Application « Veille Médicale » vous permet de consulter des articles médicaux personnalisés selon vos centres d'intérêt. Voici comment nous utilisons vos données :",
    
    dataCollected: "Données Collectées",
    dataCollectedText: "Votre e-mail et mot de passe sécurisent votre compte. Vos préférences (ex. : sujets médicaux comme la diabétologie) permettent de sélectionner des articles pertinents.",
    
    confidentiality: "Confidentialité",
    confidentialityText: "Vos données ne sont jamais vendues ni partagées. Elles servent uniquement à personnaliser votre veille et restent stockées de manière sécurisée en Europe.",
    
    appleCompliance: "Conformité Apple",
    appleComplianceText: "Nous respectons les règles de l'App Store. Pas de tracking publicitaire, pas d'accès à vos contacts ou données de santé sans permission. Les notifications sont optionnelles.",
    
    utility: "Utilité",
    utilityText: "L'Application vous informe sur les actualités médicales mais ne remplace pas un médecin.",
    
    contact: "Pour toute question ou pour supprimer vos données, contactez-nous à contact@veillemedicale.fr ou via les paramètres de l'Application.",
    
    thanks: "Merci de votre confiance !"
  }
};

export default function CompanyGroupScreen() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <MaterialIcons name="keyboard-arrow-left" size={24} color="#fff" style={{ transform: [{ translateX: -5 }, { translateY: -3 }] }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sano</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{strings.title}</Text>
        
        <Text style={styles.lastUpdated}>{strings.lastUpdated}</Text>
        
        <Text style={styles.paragraph}>{strings.content.greeting}</Text>
        
        <Text style={styles.paragraph}>{strings.content.intro}</Text>
        
        <Text style={styles.sectionTitle}>{strings.content.dataCollected}</Text>
        <Text style={styles.paragraph}>{strings.content.dataCollectedText}</Text>
        
        <Text style={styles.sectionTitle}>{strings.content.confidentiality}</Text>
        <Text style={styles.paragraph}>{strings.content.confidentialityText}</Text>
        
        <Text style={styles.sectionTitle}>{strings.content.appleCompliance}</Text>
        <Text style={styles.paragraph}>{strings.content.appleComplianceText}</Text>
        
        <Text style={styles.sectionTitle}>{strings.content.utility}</Text>
        <Text style={styles.paragraph}>{strings.content.utilityText}</Text>
        
        <Text style={styles.paragraph}>{strings.content.contact}</Text>
        
        <Text style={styles.paragraph}>{strings.content.thanks}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 18,
    paddingHorizontal: 18,
    backgroundColor: "#000",
    borderBottomWidth: 0.4,
    borderColor: "#919191",
  },
  backButton: {
    padding: 6,
    borderRadius: 100,
    borderColor: "grey",
    borderWidth: 0.5,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
    textAlign: "center",
    fontSize: 16,
  },
  headerSpacer: {
    width: 42,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    fontFamily: FONTS.sans.bold,
  },
  lastUpdated: {
    color: "#919191",
    fontSize: 12,
    marginBottom: 20,
    fontFamily: FONTS.sans.regular,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 12,
    fontFamily: FONTS.sans.bold,
  },
  paragraph: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    fontFamily: FONTS.sans.regular,
    textAlign: "justify",
  },
}); 