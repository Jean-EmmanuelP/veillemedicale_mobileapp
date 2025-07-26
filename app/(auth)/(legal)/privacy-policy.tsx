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
  title: "Politique de Confidentialité",
  lastUpdated: "Date : 26 juillet 2025",
  content: {
    intro: "Cette Politique de Confidentialité explique comment Sano collecte, utilise et protège vos données personnelles dans l'Application « Veille Médicale ». Nous respectons le RGPD et les exigences des plateformes comme l'App Store.",
    
    section1: "1. Données Collectées",
    section1Text: "Nous collectons :\n\nDonnées de Compte : E-mail et mot de passe pour l'inscription.\n\nPréférences : Thèmes médicaux (ex. : cardiologie, vaccins) pour personnaliser les articles.\n\nDonnées Techniques : Adresse IP, type d'appareil, logs pour améliorer l'Application.\n\nNous ne collectons pas de données de santé sensibles sans consentement explicite.",
    
    section2: "2. Utilisation des Données",
    section2Text: "Vos données servent à :\n\n• Gérer votre compte.\n• Personnaliser les articles affichés.\n• Améliorer l'Application (analyses anonymes).\n• Envoyer des notifications (si activées).",
    
    section3: "3. Base Légale",
    section3Text: "Consentement : Pour la personnalisation et les notifications.\n\nContrat : Pour fournir les services.\n\nIntérêt légitime : Pour la sécurité et l'amélioration technique.",
    
    section4: "4. Partage",
    section4Text: "Vos données ne sont pas partagées avec des tiers, sauf :\n\n• Avec des prestataires techniques (ex. : serveurs cloud) sous accords de confidentialité.\n• Pour des obligations légales.\n\nStockage en Europe (conforme RGPD).",
    
    section5: "5. Sécurité",
    section5Text: "• Chiffrement des données (HTTPS, stockage sécurisé).\n• Audits réguliers.\n• Aucun système n'est infaillible ; nous ne garantissons pas une sécurité absolue.",
    
    section6: "6. Conservation",
    section6Text: "Données de compte : Conservées jusqu'à la suppression de votre compte, puis effacées sous 30 jours.\n\nDonnées techniques : Conservées 12 mois.",
    
    section7: "7. Vos Droits",
    section7Text: "Vous pouvez :\n\n• Accéder, modifier ou supprimer vos données.\n• Vous opposer au traitement.\n• Contacter la CNIL.\n\nEnvoyez vos demandes à contact@veillemedicale.fr.",
    
    section8: "8. Cookies",
    section8Text: "Seuls des cookies techniques sont utilisés (pas de cookies publicitaires).",
    
    section9: "9. Modifications",
    section9Text: "Les changements seront notifiés dans l'Application ou via contact@veillemedicale.fr.",
    
    contact: "Contact : contact@veillemedicale.fr"
  }
};

export default function PrivacyPolicyScreen() {
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
        
        <Text style={styles.paragraph}>{strings.content.intro}</Text>
        
        <Text style={styles.sectionTitle}>{strings.content.section1}</Text>
        <Text style={styles.paragraph}>{strings.content.section1Text}</Text>
        
        <Text style={styles.sectionTitle}>{strings.content.section2}</Text>
        <Text style={styles.paragraph}>{strings.content.section2Text}</Text>
        
        <Text style={styles.sectionTitle}>{strings.content.section3}</Text>
        <Text style={styles.paragraph}>{strings.content.section3Text}</Text>
        
        <Text style={styles.sectionTitle}>{strings.content.section4}</Text>
        <Text style={styles.paragraph}>{strings.content.section4Text}</Text>
        
        <Text style={styles.sectionTitle}>{strings.content.section5}</Text>
        <Text style={styles.paragraph}>{strings.content.section5Text}</Text>
        
        <Text style={styles.sectionTitle}>{strings.content.section6}</Text>
        <Text style={styles.paragraph}>{strings.content.section6Text}</Text>
        
        <Text style={styles.sectionTitle}>{strings.content.section7}</Text>
        <Text style={styles.paragraph}>{strings.content.section7Text}</Text>
        
        <Text style={styles.sectionTitle}>{strings.content.section8}</Text>
        <Text style={styles.paragraph}>{strings.content.section8Text}</Text>
        
        <Text style={styles.sectionTitle}>{strings.content.section9}</Text>
        <Text style={styles.paragraph}>{strings.content.section9Text}</Text>
        
        <Text style={styles.paragraph}>{strings.content.contact}</Text>
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
    marginBottom: 8,
    fontFamily: FONTS.sans.regular,
  },
  effectiveDate: {
    color: "#fff",
    fontSize: 14,
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