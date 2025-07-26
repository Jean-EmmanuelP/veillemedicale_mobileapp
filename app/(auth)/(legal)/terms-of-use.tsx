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
  title: "Conditions Générales d'Utilisation",
  lastUpdated: "Date : 26 juillet 2025",
  content: {
    intro: "Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de l'application mobile « Veille Médicale » (ci-après « l'Application »), exploitée par Sano, située à Paris. L'Application permet de consulter des articles et actualités médicales personnalisés. En utilisant l'Application, vous (l'Utilisateur) acceptez ces CGU. Si vous ne les acceptez pas, veuillez ne pas utiliser l'Application.",
    
    section1: "1. Objet de l'Application",
    section1Text: "L'Application propose une veille médicale en publiant des articles et actualités issus de sources publiques. Elle permet une personnalisation basée sur vos préférences. Elle ne fournit pas de conseils médicaux ni de diagnostics.",
    
    section2: "2. Inscription et Accès",
    section2Text: "Compte : Vous devez créer un compte avec une adresse e-mail valide et un mot de passe pour accéder aux fonctionnalités personnalisées.\n\nÂge : L'Application est réservée aux personnes de 18 ans et plus. Les mineurs doivent avoir l'accord d'un parent ou tuteur.\n\nAccès : L'Application est gratuite mais nécessite une connexion internet. Nous pouvons suspendre l'accès en cas de non-respect des CGU.",
    
    section3: "3. Utilisation",
    section3Text: "Contenu : Les articles sont fournis à titre informatif. Nous ne garantissons pas leur exactitude ou leur exhaustivité.\n\nPersonnalisation : Vos préférences (ex. : sujets médicaux d'intérêt) permettent de filtrer les articles. Ces données sont protégées (voir Politique de Confidentialité).\n\nInterdictions : Vous ne devez pas :\n• Utiliser l'Application à des fins illégales.\n• Modifier ou pirater l'Application.\n• Partager du contenu inapproprié.",
    
    section4: "4. Propriété Intellectuelle",
    section4Text: "L'Application, son design et son contenu (hors articles publics) appartiennent à Sano. Vous disposez d'une licence personnelle non transférable pour l'utiliser.",
    
    section5: "5. Responsabilité",
    section5Text: "Nous ne sommes pas responsables des dommages liés à l'utilisation de l'Application ou à l'inexactitude des articles.\n\nVous êtes responsable des informations fournies et de l'usage des contenus.",
    
    section6: "6. Données Personnelles",
    section6Text: "Vos données (e-mail, mot de passe, préférences) sont traitées selon notre Politique de Confidentialité ci-dessous.",
    
    section7: "7. Résiliation",
    section7Text: "Vous pouvez supprimer votre compte via l'Application.\n\nNous pouvons fermer votre compte en cas de violation des CGU.",
    
    section8: "8. Modifications",
    section8Text: "Nous pouvons modifier les CGU. Les changements seront notifiés dans l'Application ou par e-mail à contact@veillemedicale.fr.",
    
    section9: "9. Loi Applicable",
    section9Text: "Ces CGU sont régies par le droit français. Les litiges relèvent des tribunaux de Paris.",
    
    contact: "Contact : contact@veillemedicale.fr"
  }
};

export default function TermsOfUseScreen() {
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
        
        {/* Add more content sections as needed */}
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