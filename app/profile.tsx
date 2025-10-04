import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
  Platform,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setUser, setSession } from '../store/authSlice';
import { fetchProfile, updateProfile, clearSaveSuccess } from '../store/profileSlice';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../assets/constants/colors';
import { FONTS, FONT_SIZES } from '../assets/constants/fonts';
import NotificationService from '../services/NotificationService';
import { BlurView } from 'expo-blur';
import { renderGradeStars } from '../utils/gradeStars';
import LinkGuestAccountSection from '../components/LinkGuestAccountSection';
import ModernDatePicker from '../components/ModernDatePicker';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, session, isAnonymous, linkStep } = useAppSelector((state) => state.auth);
  const {
    profile,
    loading,
    error,
    disciplines,
    currentSubscriptions,
    statusOptions,
    notificationOptions,
    saveSuccess,
  } = useAppSelector((state) => state.profile);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [status, setStatus] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [notificationFrequency, setNotificationFrequency] = useState('');
  const [minimumGradeNotification, setMinimumGradeNotification] = useState('');
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [currentSubscriptionsSet, setCurrentSubscriptionsSet] = useState<Set<string>>(new Set());
  const [openDisciplines, setOpenDisciplines] = useState<Set<number>>(new Set());

  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showModernDatePicker, setShowModernDatePicker] = useState(false);
  const [showGradeInfo, setShowGradeInfo] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);

  // Ajouts pour le mode admin secret
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [notifTitle, setNotifTitle] = useState('Notification admin');
  const [notifBody, setNotifBody] = useState('Ceci est une notification envoyée à tous les utilisateurs.');
  const [targetUserId, setTargetUserId] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    console.log("--------------------------------")
    console.log('👤 [PROFILE] user:', user);
    console.log("--------------------------------")
    // Ne pas charger le profil pour les utilisateurs anonymes
    if (user?.id && !isAnonymous) {
      console.log('📋 [PROFILE] Loading profile for permanent user:', {
        userId: user.id,
        email: user.email,
        isAnonymous
      });
      dispatch(fetchProfile(user.id));
    } else if (user?.id && isAnonymous) {
      console.log('👤 [PROFILE] Anonymous user detected, profile loading skipped:', {
        userId: user.id,
        email: user.email || 'No email (anonymous)',
        isAnonymous
      });
    } else {
      console.log('❌ [PROFILE] No user found or user not ready');
    }
  }, [user?.id, isAnonymous]);

  useEffect(() => {
    // Ne mettre à jour les champs que pour les utilisateurs non-anonymes
    if (profile && !isAnonymous) {
      console.log('📝 [PROFILE] Updating form fields with profile data:', {
        profileId: profile.id,
        firstName: profile.first_name,
        lastName: profile.last_name,
        email: profile.email,
        status: profile.status,
        subscriptionsCount: profile.subscriptions?.length || 0,
        minimumGradeNotification: profile.minimum_grade_notification
      });
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setStatus(profile.status || '');
      setSpecialty(profile.specialty || '');
      setDateOfBirth(profile.date_of_birth || '');
      setNotificationFrequency(profile.notification_frequency || 'tous_les_jours');
      setMinimumGradeNotification(profile.minimum_grade_notification || '');
      
      // Auto-select grades based on minimum_grade_notification
      if (profile.minimum_grade_notification) {
        const autoSelectedGrades = getGradesFromMinimum(profile.minimum_grade_notification);
        console.log('🎯 [PROFILE] Auto-selecting grades from minimum:', {
          minimumGrade: profile.minimum_grade_notification,
          selectedGrades: autoSelectedGrades
        });
        setSelectedGrades(autoSelectedGrades);
      } else {
        // Fallback to grade_preferences if minimum_grade_notification is not set
        setSelectedGrades(profile.grade_preferences || []);
      }
    } else if (isAnonymous) {
      console.log('👤 [PROFILE] Anonymous user - form fields update skipped');
    }
  }, [profile, isAnonymous]);

  useEffect(() => {
    // Convertir les abonnements en Set pour une recherche plus rapide (seulement pour les utilisateurs non-anonymes)
    if (!isAnonymous) {
      const subscriptionsSet = new Set(
        currentSubscriptions.map(sub => 
          sub.sub_discipline_id ? `s:${sub.sub_discipline_id}` : `d:${sub.discipline_id}`
        )
      );
      setCurrentSubscriptionsSet(subscriptionsSet);

      // Ouvrir automatiquement les disciplines qui ont des sous-spécialités sélectionnées
      const openDisciplinesSet = new Set<number>();
      currentSubscriptions.forEach(sub => {
        if (sub.discipline_id) {
          openDisciplinesSet.add(sub.discipline_id);
        }
      });
      
      // Aussi ouvrir les disciplines qui ont des sous-spécialités dans subscriptionsSet
      disciplines.forEach(discipline => {
        const hasSelectedSubSpecialties = discipline.sub_disciplines.some(subDisc =>
          subscriptionsSet.has(`s:${subDisc.id}`)
        );
        if (hasSelectedSubSpecialties) {
          openDisciplinesSet.add(discipline.id);
        }
      });
      
      console.log('📂 [PROFILE] Auto-opening disciplines with selected sub-specialties:', {
        openDisciplines: Array.from(openDisciplinesSet),
        subscriptions: Array.from(subscriptionsSet)
      });
      
      setOpenDisciplines(openDisciplinesSet);
    }
  }, [currentSubscriptions, disciplines, isAnonymous]);

  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => {
        dispatch(clearSaveSuccess());
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  // Reset admin click count après un délai pour éviter les clics espacés
  useEffect(() => {
    if (adminClickCount === 0) return;
    const timeout = setTimeout(() => setAdminClickCount(0), 2000);
    return () => clearTimeout(timeout);
  }, [adminClickCount]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // ✅ Suppression des dispatch manuels et de la redirection
      // car l'onAuthStateChange dans _layout.tsx gère déjà tout automatiquement
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors de la déconnexion');
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    
    setDeleteAccountLoading(true);
    try {
      const response = await fetch('https://etxelhjnqbrgwuitltyk.supabase.co/functions/v1/self-deletion-user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0eGVsaGpucWJyZ3d1aXRsdHlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2OTE5NzAsImV4cCI6MjA1NjI2Nzk3MH0.EvaK9bCSYaBVaVOIgakKTAVoM8UrDYg2HX7Z-iyWoD4`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          user_id: user.id
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        Alert.alert(
          'Compte supprimé',
          'Votre compte et toutes vos données ont été supprimés avec succès.',
          [
            {
              text: 'OK',
              onPress: () => {
                dispatch(setUser(null));
                dispatch(setSession(null));
                router.replace('/(auth)');
              }
            }
          ]
        );
      } else {
        Alert.alert('Erreur', `Erreur lors de la suppression: ${data.error || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error('Delete account error:', error);
      Alert.alert('Erreur', 'Erreur de connexion lors de la suppression du compte');
    } finally {
      setDeleteAccountLoading(false);
      setShowDeleteAccountModal(false);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) return;

    const subscriptions = Array.from(currentSubscriptionsSet).map(key => {
      const [type, id] = key.split(':');
      return {
        discipline_id: type === 's' ? 
          disciplines.find(d => d.sub_disciplines.some(s => s.id === parseInt(id)))?.id || 0 : 
          parseInt(id),
        sub_discipline_id: type === 's' ? parseInt(id) : null
      };
    });

    try {
      console.log('💾 [PROFILE] Saving profile with minimum grade:', {
        minimumGrade: minimumGradeNotification,
        autoSelectedGrades: selectedGrades
      });

      await dispatch(updateProfile({
        userId: user.id,
        profile: {
          first_name: firstName,
          last_name: lastName,
          status,
          specialty,
          date_of_birth: dateOfBirth,
          notification_frequency: notificationFrequency,
          minimum_grade_notification: minimumGradeNotification,
        },
        subscriptions,
        gradePreferences: selectedGrades, // Save the auto-calculated grades too
      })).unwrap();

      // Mettre à jour les préférences de notification
      try {
        await NotificationService.getInstance().updateNotificationPreferences(
          user.id,
          notificationFrequency as any
        );
      } catch (error) {
        console.error('Failed to update notification preferences:', error);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors de la mise à jour du profil');
    }
  };

  const handleTestNotification = async () => {
    try {
      // TODO: Fix this when NotificationService.sendTestNotification is updated to not require parameters
      // await NotificationService.getInstance().sendTestNotification();
      Alert.alert('Succès', 'Notification de test envoyée !');
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors de l\'envoi de la notification de test');
    }
  };

  const handleSendToAll = async () => {
    // Protection : ne pas envoyer de notifications pour les utilisateurs anonymes
    if (isAnonymous) {
      console.log('👤 [PROFILE] handleSendToAll skipped for anonymous user');
      Alert.alert('Erreur', 'Cette fonction n\'est pas disponible pour les comptes invités.');
      return;
    }

    setSending(true);
    try {
      console.log('📧 [PROFILE] Fetching all users for admin broadcast...');
      // Récupérer tous les users
      const { data: users, error } = await supabase.from('user_profiles').select('id');
      if (error) throw error;
      if (!users || users.length === 0) throw new Error('Aucun utilisateur trouvé');
      let success = 0, fail = 0;
      for (const u of users) {
        try {
          await NotificationService.getInstance().sendNotificationViaEdge(
            u.id,
            notifTitle,
            notifBody,
            { type: 'admin_broadcast' }
          );
          success++;
        } catch (e) {
          fail++;
        }
      }
      Alert.alert('Succès', `Notifications envoyées à ${success} utilisateurs. ${fail > 0 ? fail + ' échecs.' : ''}`);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Erreur lors de l\'envoi';
      Alert.alert('Erreur', errorMessage);
    }
    setSending(false);
  };

  const handleSendToUser = async () => {
    // Protection : ne pas envoyer de notifications pour les utilisateurs anonymes
    if (isAnonymous) {
      console.log('👤 [PROFILE] handleSendToUser skipped for anonymous user');
      Alert.alert('Erreur', 'Cette fonction n\'est pas disponible pour les comptes invités.');
      return;
    }

    if (!targetUserId) {
      Alert.alert('Erreur', 'Veuillez saisir un ID utilisateur');
      return;
    }
    setSending(true);
    try {
      console.log('📧 [PROFILE] Sending notification to specific user:', targetUserId);
      await NotificationService.getInstance().sendNotificationViaEdge(
        targetUserId,
        notifTitle,
        notifBody,
        { type: 'admin_targeted' }
      );
      Alert.alert('Succès', 'Notification envoyée à l\'utilisateur');
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Erreur lors de l\'envoi';
      Alert.alert('Erreur', errorMessage);
    }
    setSending(false);
  };

  const toggleDisciplineSection = (disciplineId: number) => {
    const newSet = new Set(openDisciplines);
    if (newSet.has(disciplineId)) {
      newSet.delete(disciplineId);
    } else {
      newSet.add(disciplineId);
    }
    setOpenDisciplines(newSet);
  };

  const handleMainDisciplineChange = (disciplineId: number, isChecked: boolean) => {
    const newSubs = new Set(currentSubscriptionsSet);
    const discipline = disciplines.find(d => d.id === disciplineId);
    
    console.log('🏥 [PROFILE] Main discipline change:', {
      disciplineId,
      disciplineName: discipline?.name,
      isChecked,
      currentSubs: Array.from(currentSubscriptionsSet)
    });
    
    if (isChecked) {
      // Ajouter la spécialité principale
      newSubs.add(`d:${disciplineId}`);
      // Ajouter TOUTES les sous-spécialités automatiquement
      discipline?.sub_disciplines.forEach(sub => {
        newSubs.add(`s:${sub.id}`);
      });
      // Ouvrir automatiquement la section
      setOpenDisciplines(prev => new Set([...prev, disciplineId]));
    } else {
      // Supprimer la spécialité principale
      newSubs.delete(`d:${disciplineId}`);
      // Supprimer TOUTES les sous-spécialités
      discipline?.sub_disciplines.forEach(sub => {
        newSubs.delete(`s:${sub.id}`);
      });
    }
    
    console.log('🏥 [PROFILE] After main discipline change:', {
      newSubs: Array.from(newSubs)
    });
    
    setCurrentSubscriptionsSet(newSubs);
  };

  const handleSubDisciplineChange = (subDisciplineId: number, disciplineId: number, isChecked: boolean) => {
    const newSubs = new Set(currentSubscriptionsSet);
    const discipline = disciplines.find(d => d.id === disciplineId);
    const subDiscipline = discipline?.sub_disciplines.find(s => s.id === subDisciplineId);
    
    console.log('🔬 [PROFILE] Sub-discipline change:', {
      subDisciplineId,
      disciplineId,
      subDisciplineName: subDiscipline?.name,
      disciplineName: discipline?.name,
      isChecked,
      currentSubs: Array.from(currentSubscriptionsSet)
    });
    
    if (isChecked) {
      // Ajouter la sous-spécialité
      newSubs.add(`s:${subDisciplineId}`);
      // AUTOMATIQUEMENT ajouter la spécialité parente si pas déjà présente
      if (!newSubs.has(`d:${disciplineId}`)) {
        console.log('🔗 [PROFILE] Auto-adding parent discipline:', disciplineId);
        newSubs.add(`d:${disciplineId}`);
      }
    } else {
      // Supprimer la sous-spécialité
      newSubs.delete(`s:${subDisciplineId}`);
      
      // Vérifier s'il reste d'autres sous-spécialités de cette discipline
      const remainingSubsForDiscipline = discipline?.sub_disciplines.filter(sub =>
        sub.id !== subDisciplineId && newSubs.has(`s:${sub.id}`)
      );
      
      // Si plus aucune sous-spécialité sélectionnée, décocher la spécialité principale
      if (!remainingSubsForDiscipline || remainingSubsForDiscipline.length === 0) {
        console.log('🔗 [PROFILE] Auto-removing parent discipline (no more sub-specialties):', disciplineId);
        newSubs.delete(`d:${disciplineId}`);
      }
    }
    
    console.log('🔬 [PROFILE] After sub-discipline change:', {
      newSubs: Array.from(newSubs)
    });
    
    setCurrentSubscriptionsSet(newSubs);
  };

  // Convert YYYY-MM-DD to DD/MM/YYYY for display
  const formatDisplayDate = (dateString: string): string => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleDateSelect = (date: string) => {
    setDateOfBirth(date);
  };

  // Calculate selected grades based on minimum grade
  const getGradesFromMinimum = (minimumGrade: string): string[] => {
    const gradeHierarchy = ['A', 'B', 'C']; // A is highest, C is lowest
    const minimumIndex = gradeHierarchy.indexOf(minimumGrade);
    
    if (minimumIndex === -1) return [];
    
    // Return all grades from A down to the minimum grade
    return gradeHierarchy.slice(0, minimumIndex + 1);
  };

  // Handle minimum grade change and update selected grades accordingly
  const handleMinimumGradeChange = (grade: string) => {
    console.log('🎯 [PROFILE] Setting minimum grade to:', grade);
    setMinimumGradeNotification(grade);
    
    // Automatically select this grade and all superior grades
    const gradesFromMinimum = getGradesFromMinimum(grade);
    console.log('🎯 [PROFILE] Auto-selecting grades:', gradesFromMinimum);
    setSelectedGrades(gradesFromMinimum);
  };

  const gradeInfo = [
    {
      grade: 'A',
      label: 'Preuve scientifique établie',
      niveau: 'Niveau 1',
      details: [
        'essais comparatifs randomisés de forte puissance',
        'méta-analyse d\'essais comparatifs randomisés',
        'analyse de décision fondée sur des études bien menées.'
      ]
    },
    {
      grade: 'B',
      label: 'Présomption scientifique',
      niveau: 'Niveau 2',
      details: [
        'essais comparatifs randomisés de faible puissance',
        'études comparatives non randomisées bien menées',
        'études de cohortes.'
      ]
    },
    {
      grade: 'C',
      label: 'Faible niveau de preuve scientifique',
      niveau: 'Niveau 3 et 4',
      details: [
        'études cas-témoins',
        'études comparatives comportant des biais importants',
        'études rétrospectives',
        'séries de cas',
        'études épidémiologiques descriptives (transversale, longitudinale).'
      ]
    }
  ];

  const handleAdminTitlePress = () => {
    setAdminClickCount((prev) => {
      if (prev + 1 >= 10) {
        setShowAdminModal(true);
        return 0;
      }
      return prev + 1;
    });
  };

  const handleAdminPasswordSubmit = () => {
    if (adminPassword === 'fleur321') {
      setAdminAuthenticated(true);
    } else {
      Alert.alert('Erreur', 'Mot de passe incorrect');
    }
  };

  const renderStatusModal = () => (
    <Modal
      visible={showStatusModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowStatusModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choisir votre statut</Text>
            <TouchableOpacity onPress={() => setShowStatusModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.iconPrimary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={statusOptions}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  setStatus(item);
                  setShowStatusModal(false);
                }}
              >
                <Text style={[
                  styles.modalItemText,
                  status === item && styles.modalItemTextSelected
                ]}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  const renderNotificationModal = () => (
    <Modal
      visible={showNotificationModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowNotificationModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Fréquence des notifications</Text>
            <TouchableOpacity onPress={() => setShowNotificationModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.iconPrimary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={notificationOptions}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  setNotificationFrequency(item.value);
                  setShowNotificationModal(false);
                }}
              >
                <Text style={[
                  styles.modalItemText,
                  notificationFrequency === item.value && styles.modalItemTextSelected
                ]}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  const renderDeleteAccountModal = () => (
    <Modal
      visible={showDeleteAccountModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowDeleteAccountModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Supprimer le compte</Text>
            <TouchableOpacity onPress={() => setShowDeleteAccountModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.iconPrimary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.deleteAccountContent}>
            <Ionicons name="warning" size={48} color="#ff6b6b" style={styles.deleteAccountIcon} />
            <Text style={styles.deleteAccountTitle}>Attention !</Text>
            <Text style={styles.deleteAccountDescription}>
              Cette action est irréversible. Toutes vos données seront définitivement supprimées :
            </Text>
            <View style={styles.deleteAccountList}>
              <Text style={styles.deleteAccountListItem}>• Votre profil utilisateur</Text>
              <Text style={styles.deleteAccountListItem}>• Vos articles sauvegardés</Text>
              <Text style={styles.deleteAccountListItem}>• Vos préférences de veille</Text>
              <Text style={styles.deleteAccountListItem}>• Toutes vos données personnelles</Text>
            </View>
            <Text style={styles.deleteAccountWarning}>
              Êtes-vous sûr de vouloir continuer ?
            </Text>
          </View>

          <View style={styles.deleteAccountButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowDeleteAccountModal(false)}
              disabled={deleteAccountLoading}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.confirmDeleteButton}
              onPress={handleDeleteAccount}
              disabled={deleteAccountLoading}
            >
              {deleteAccountLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmDeleteButtonText}>Supprimer définitivement</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderAdminModal = () => (
    <Modal
      visible={showAdminModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => {
        setShowAdminModal(false);
        setAdminAuthenticated(false);
        setAdminPassword('');
      }}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, width: '85%' }}>
          {!adminAuthenticated ? (
            <>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 16 }}>Accès administrateur</Text>
              <TextInput
                placeholder="Mot de passe admin"
                secureTextEntry
                value={adminPassword}
                onChangeText={setAdminPassword}
                style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 16 }}
                autoFocus
                onSubmitEditing={handleAdminPasswordSubmit}
              />
              <TouchableOpacity
                style={{ backgroundColor: '#1976D2', padding: 12, borderRadius: 8, alignItems: 'center' }}
                onPress={handleAdminPasswordSubmit}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Valider</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 16 }}>Envoyer une notification admin</Text>
              <TextInput
                placeholder="Titre de la notification"
                value={notifTitle}
                onChangeText={setNotifTitle}
                style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 8 }}
              />
              <TextInput
                placeholder="Message de la notification"
                value={notifBody}
                onChangeText={setNotifBody}
                style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 16 }}
              />
              <TouchableOpacity
                style={{ backgroundColor: '#388E3C', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 16, opacity: sending ? 0.6 : 1 }}
                onPress={handleSendToAll}
                disabled={sending}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Envoyer à tous les utilisateurs</Text>
              </TouchableOpacity>
              <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Ou cibler un utilisateur :</Text>
              <TextInput
                placeholder="ID utilisateur cible"
                value={targetUserId}
                onChangeText={setTargetUserId}
                style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 8 }}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={{ backgroundColor: '#1976D2', padding: 12, borderRadius: 8, alignItems: 'center', opacity: sending ? 0.6 : 1 }}
                onPress={handleSendToUser}
                disabled={sending}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Envoyer à cet utilisateur</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ marginTop: 16, alignItems: 'center' }}
                onPress={() => {
                  setShowAdminModal(false);
                  setAdminAuthenticated(false);
                  setAdminPassword('');
                }}
              >
                <Text style={{ color: '#D32F2F', fontWeight: 'bold' }}>Fermer</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  const handleBackPress = () => {
    router.back();
  };

  if (loading && !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.iconPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Custom header with back button */}
      <BlurView intensity={0} tint="dark" style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.iconPrimary} />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleAdminTitlePress} activeOpacity={0.7} style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Paramètres</Text>
          </TouchableOpacity>
          
          <View style={styles.headerSpacer} />
        </View>
      </BlurView>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {saveSuccess && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>Mise à jour réussie !</Text>
          </View>
        )}

        {isAnonymous ? (
          <LinkGuestAccountSection />
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vos informations</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Prénom</Text>
                <TextInput
                  style={styles.modernInput}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Votre prénom"
                  placeholderTextColor={COLORS.textPlaceholder}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Nom</Text>
                <TextInput
                  style={styles.modernInput}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Votre nom"
                  placeholderTextColor={COLORS.textPlaceholder}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Statut</Text>
                <TouchableOpacity
                  style={styles.modernSelectButton}
                  onPress={() => setShowStatusModal(true)}
                >
                  <Text style={styles.selectButtonText}>
                    {status || 'Choisir votre statut'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={COLORS.iconSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Spécialité</Text>
                <TextInput
                  style={styles.modernInput}
                  value={specialty}
                  onChangeText={setSpecialty}
                  placeholder="Ex: Médecine Générale"
                  placeholderTextColor={COLORS.textPlaceholder}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Date de naissance</Text>
                <TouchableOpacity
                  style={styles.modernSelectButton}
                  onPress={() => setShowModernDatePicker(true)}
                >
                  <Text style={styles.selectButtonText}>
                    {dateOfBirth ? formatDisplayDate(dateOfBirth) : 'DD/MM/YYYY'}
                  </Text>
                  <Ionicons name="calendar" size={20} color={COLORS.iconSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Séparateur élégant */}
            <View style={styles.sectionSeparator} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vos préférences de veille</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Fréquence des notifications</Text>
                <TouchableOpacity
                  style={styles.modernSelectButton}
                  onPress={() => setShowNotificationModal(true)}
                >
                  <Text style={styles.selectButtonText}>
                    {notificationOptions.find(opt => opt.value === notificationFrequency)?.label || 'Choisir une fréquence'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={COLORS.iconSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.labelWithInfo}>
                  <Text style={styles.label}>Grade de recommandation minimum</Text>
                  <TouchableOpacity
                    onPress={() => setShowGradeInfo(!showGradeInfo)}
                    style={styles.infoIconButton}
                  >
                    <Ionicons name="information-circle-outline" size={20} color={COLORS.iconSecondary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.gradeExplanation}>
                  Sélectionnez votre grade minimum pour recevoir les recommandations de ce grade et de tous les grades supérieurs.
                </Text>
                <View style={styles.gradeContainer}>
                  {['A', 'B', 'C'].map((grade) => {
                    const isMinimumGrade = minimumGradeNotification === grade;
                    const isIncluded = selectedGrades.includes(grade);
                    return (
                      <TouchableOpacity
                        key={grade}
                        style={[
                          styles.cleanGradeButton,
                          isMinimumGrade && styles.cleanGradeButtonSelected,
                        ]}
                        onPress={() => handleMinimumGradeChange(grade)}
                      >
                        <View style={styles.gradeContent}>
                          {renderGradeStars(grade, 18)}
                          <Text
                            style={[
                              styles.cleanGradeText,
                              isMinimumGrade && styles.cleanGradeTextSelected,
                            ]}
                          >
                            Grade {grade}
                          </Text>
                          {isMinimumGrade && (
                            <View style={styles.selectedIndicator}>
                              <Ionicons name="checkmark-circle" size={16} color={COLORS.buttonBackgroundPrimary} />
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {showGradeInfo && (
                <View style={styles.gradeInfoContainer}>
                  <Text style={styles.gradeInfoTitle}>Niveaux de preuve scientifique</Text>
                  {gradeInfo.map((info) => (
                    <View key={info.grade} style={styles.gradeInfoItem}>
                      <View style={styles.gradeInfoHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          {renderGradeStars(info.grade, 16)}
                          <Text style={styles.gradeInfoGrade}>Grade {info.grade}</Text>
                        </View>
                        <Text style={styles.gradeInfoLabel}>{info.label}</Text>
                      </View>
                      <Text style={styles.gradeInfoNiveau}>{info.niveau}</Text>
                      {info.details.map((detail, index) => (
                        <Text key={index} style={styles.gradeInfoDetail}>
                          • {detail}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.inputContainer}>
                <View style={styles.specialtyHeaderContainer}>
                  <View style={styles.specialtyTitleContainer}>
                    <Text style={styles.label}>Spécialités suivies</Text>
                    <Text style={[
                      styles.specialtyStats,
                      (() => {
                        const originalSubscriptionsSet = new Set(
                          currentSubscriptions.map(sub =>
                            sub.sub_discipline_id ? `s:${sub.sub_discipline_id}` : `d:${sub.discipline_id}`
                          )
                        );
                        const hasChanges =
                          currentSubscriptionsSet.size !== originalSubscriptionsSet.size ||
                          Array.from(currentSubscriptionsSet).some(sub => !originalSubscriptionsSet.has(sub)) ||
                          Array.from(originalSubscriptionsSet).some(sub => !currentSubscriptionsSet.has(sub));

                        return hasChanges ? styles.specialtyStatsModified : null;
                      })()
                    ]}>
                      {(() => {
                        const originalCount = currentSubscriptions.length;
                        const currentCount = currentSubscriptionsSet.size;

                        if (currentCount === 0) {
                          return 'Aucune sélection';
                        }

                        const hasChanges = (() => {
                          const originalSubscriptionsSet = new Set(
                            currentSubscriptions.map(sub =>
                              sub.sub_discipline_id ? `s:${sub.sub_discipline_id}` : `d:${sub.discipline_id}`
                            )
                          );
                          return currentSubscriptionsSet.size !== originalSubscriptionsSet.size ||
                            Array.from(currentSubscriptionsSet).some(sub => !originalSubscriptionsSet.has(sub)) ||
                            Array.from(originalSubscriptionsSet).some(sub => !currentSubscriptionsSet.has(sub));
                        })();

                        const baseText = `${currentCount} sélectionnée${currentCount > 1 ? 's' : ''}`;
                        return hasChanges ? `${baseText} (modifié)` : baseText;
                      })()}
                    </Text>
                  </View>
                  {(() => {
                    // Calculer l'état original depuis la base de données
                    const originalSubscriptionsSet = new Set(
                      currentSubscriptions.map(sub =>
                        sub.sub_discipline_id ? `s:${sub.sub_discipline_id}` : `d:${sub.discipline_id}`
                      )
                    );

                    // Vérifier s'il y a des changements
                    const hasChanges =
                      currentSubscriptionsSet.size !== originalSubscriptionsSet.size ||
                      Array.from(currentSubscriptionsSet).some(sub => !originalSubscriptionsSet.has(sub)) ||
                      Array.from(originalSubscriptionsSet).some(sub => !currentSubscriptionsSet.has(sub));

                    return hasChanges ? (
                      <TouchableOpacity
                        style={styles.cleanResetButton}
                        onPress={() => {
                          console.log('🔄 [PROFILE] Resetting specialties to saved state');
                          console.log('🔄 [PROFILE] Restoring to original subscriptions:', {
                            original: Array.from(originalSubscriptionsSet),
                            current: Array.from(currentSubscriptionsSet)
                          });
                          setCurrentSubscriptionsSet(originalSubscriptionsSet);
                        }}
                      >
                        <Ionicons name="refresh-outline" size={16} color={COLORS.iconSecondary} />
                      </TouchableOpacity>
                    ) : null;
                  })()}
                </View>

                <ScrollView style={styles.disciplinesContainer}>
                  {disciplines.map((discipline) => {
                    const isDisciplineSelected = currentSubscriptionsSet.has(`d:${discipline.id}`);
                    const selectedSubsCount = discipline.sub_disciplines.filter(sub => 
                      currentSubscriptionsSet.has(`s:${sub.id}`)
                    ).length;
                    
                    return (
                      <View key={discipline.id} style={styles.modernDisciplineGroup}>
                        <View style={styles.modernDisciplineHeader}>
                          <TouchableOpacity
                            style={styles.modernDisciplineItem}
                            onPress={() => handleMainDisciplineChange(
                              discipline.id,
                              !isDisciplineSelected
                            )}
                          >
                            <View style={[
                              styles.modernCheckbox,
                              isDisciplineSelected && styles.modernCheckboxSelected
                            ]}>
                              {isDisciplineSelected && (
                                <Ionicons name="checkmark" size={16} color={COLORS.white} />
                              )}
                            </View>
                            <View style={styles.disciplineInfo}>
                              <Text style={[
                                styles.modernDisciplineName,
                                isDisciplineSelected && styles.modernDisciplineNameSelected
                              ]}>
                                {discipline.name}
                              </Text>
                              {selectedSubsCount > 0 && (
                                <Text style={styles.subSpecialtyCount}>
                                  {selectedSubsCount} sous-spécialité{selectedSubsCount > 1 ? 's' : ''} suivie{selectedSubsCount > 1 ? 's' : ''}
                                </Text>
                              )}
                            </View>
                            {isDisciplineSelected && (
                              <View style={styles.followingBadge}>
                                <Text style={styles.followingBadgeText}>SUIVI</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                          {discipline.sub_disciplines.length > 0 && (
                            <TouchableOpacity
                              onPress={() => toggleDisciplineSection(discipline.id)}
                              style={styles.modernExpandButton}
                            >
                              <Ionicons
                                name={
                                  openDisciplines.has(discipline.id)
                                    ? 'chevron-up'
                                    : 'chevron-down'
                                }
                                size={20}
                                color={COLORS.iconSecondary}
                              />
                            </TouchableOpacity>
                          )}
                        </View>
                        {openDisciplines.has(discipline.id) &&
                          discipline.sub_disciplines.length > 0 && (
                            <View style={styles.modernSubDisciplinesContainer}>
                              {discipline.sub_disciplines.map((sub) => {
                                const isSubSelected = currentSubscriptionsSet.has(`s:${sub.id}`);
                                return (
                                  <TouchableOpacity
                                    key={sub.id}
                                    style={styles.modernSubDisciplineItem}
                                    onPress={() =>
                                      handleSubDisciplineChange(
                                        sub.id,
                                        discipline.id,
                                        !isSubSelected
                                      )
                                    }
                                  >
                                    <View style={[
                                      styles.modernCheckbox,
                                      isSubSelected && styles.modernCheckboxSelected
                                    ]}>
                                      {isSubSelected && (
                                        <Ionicons name="checkmark" size={14} color={COLORS.white} />
                                      )}
                                    </View>
                                    <Text style={[
                                      styles.modernSubDisciplineName,
                                      isSubSelected && styles.modernSubDisciplineNameSelected
                                    ]}>
                                      {sub.name}
                                    </Text>
                                    {isSubSelected && (
                                      <View style={styles.miniFollowingBadge}>
                                        <Text style={styles.miniFollowingBadgeText}>✓</Text>
                                      </View>
                                    )}
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          )}
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modernSaveButton}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#1C1C1C" />
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                  <Text style={styles.modernSaveButtonText}>
                    {saveSuccess ? 'Enregistrement effectué' : 'Enregistrer les modifications'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modernLogoutButton}
              onPress={handleLogout}
              disabled={loading}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="log-out-outline" size={20} color={COLORS.textSecondary} />
                <Text style={styles.modernLogoutButtonText}>Déconnexion</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modernDeleteAccountButton}
              onPress={() => setShowDeleteAccountModal(true)}
              disabled={loading}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                <Text style={styles.modernDeleteAccountButtonText}>Supprimer mon compte</Text>
              </View>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {renderStatusModal()}
      {renderNotificationModal()}
      {renderDeleteAccountModal()}
      {renderAdminModal()}
      
      {/* Modern Date Picker */}
      <ModernDatePicker
        visible={showModernDatePicker}
        onClose={() => setShowModernDatePicker(false)}
        onDateSelect={handleDateSelect}
        initialDate={dateOfBirth}
        title="Anniversaire 🎉"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundPrimary,
  },
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 10,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: 'black',
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    padding: 4,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    fontSize: FONT_SIZES.lg,
    textAlign: 'center',
    fontFamily: FONTS.sans.bold,
    textTransform: 'uppercase',
  },
  headerSpacer: {
    width: 32, // Same width as back button to center the title
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40, // Regular padding since no navbar on this page
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundPrimary,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.sans.bold,
    marginBottom: 20,
    color: COLORS.textPrimary,
    paddingLeft: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.medium,
    marginBottom: 8,
    color: COLORS.textPrimary,
    paddingLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.borderInput,
    borderRadius: 5,
    padding: 10,
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.regular,
    backgroundColor: COLORS.backgroundPrimary,
    color: COLORS.textPrimary,
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderInput,
    borderRadius: 5,
    padding: 10,
    backgroundColor: COLORS.backgroundPrimary,
  },
  selectButtonText: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    backgroundColor: COLORS.backgroundModal,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderPrimary,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.sans.bold,
    color: COLORS.textPrimary,
  },
  modalItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderPrimary,
  },
  modalItemText: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textPrimary,
  },
  modalItemTextSelected: {
    fontFamily: FONTS.sans.bold,
    color: COLORS.textPrimary,
  },
  gradeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    gap: 10,
  },
  cleanGradeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#424242',
    borderRadius: 16,
    backgroundColor: '#1C1C1C',
    minHeight: 90,
    position: 'relative',
    overflow: 'hidden',
  },
  cleanGradeButtonSelected: {
    backgroundColor: '#1E3A5F',
    borderColor: COLORS.buttonBackgroundPrimary,
    borderWidth: 2,
  },
  superModernGradeButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORS.borderInput,
    borderRadius: 12,
    marginHorizontal: 5,
    backgroundColor: COLORS.backgroundPrimary,
    minHeight: 80,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  superModernGradeButtonSelected: {
    backgroundColor: COLORS.buttonBackgroundPrimary,
    borderColor: COLORS.buttonBackgroundPrimary,
    borderWidth: 3,
    shadowColor: COLORS.buttonBackgroundPrimary,
    shadowOpacity: 0.4,
    transform: [{ scale: 1.02 }],
  },
  superModernGradeButtonMinimum: {
    borderColor: COLORS.buttonBackgroundPrimary,
    borderWidth: 3,
    shadowColor: COLORS.buttonBackgroundPrimary,
    shadowOpacity: 0.4,
    transform: [{ scale: 1.02 }],
  },
  superModernGradeButtonIncluded: {
    borderColor: COLORS.buttonBackgroundPrimary,
    borderWidth: 2,
    shadowColor: COLORS.buttonBackgroundPrimary,
    shadowOpacity: 0.3,
    transform: [{ scale: 0.98 }],
  },
  gradeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.success,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  gradeContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  cleanGradeText: {
    fontFamily: FONTS.sans.medium,
    color: '#616161',
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
  cleanGradeTextSelected: {
    fontFamily: FONTS.sans.semibold,
    color: COLORS.buttonBackgroundPrimary,
  },
  selectedIndicator: {
    marginTop: 4,
  },
  superModernGradeText: {
    fontFamily: FONTS.sans.medium,
    color: COLORS.textPrimary,
    marginTop: 8,
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
  superModernGradeTextSelected: {
    fontFamily: FONTS.sans.bold,
    color: COLORS.white,
  },
  gradeStatus: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.sans.bold,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gradeStatusSelected: {
    fontFamily: FONTS.sans.bold,
    color: COLORS.white,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modernInput: {
    borderWidth: 1,
    borderColor: COLORS.borderInput,
    borderRadius: 12,
    padding: 15,
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.regular,
    backgroundColor: COLORS.backgroundPrimary,
    color: COLORS.textPrimary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modernSaveButton: {
    backgroundColor: COLORS.buttonBackgroundPrimary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  modernSaveButtonText: {
    color: COLORS.buttonTextPrimary,
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.semibold,
    marginLeft: 8,
    letterSpacing: 0.2,
  },
  modernLogoutButton: {
    backgroundColor: 'transparent',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
  },
  modernLogoutButtonText: {
    color: '#616161',
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.medium,
    marginLeft: 8,
  },
  modernDeleteAccountButton: {
    backgroundColor: 'transparent',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modernDeleteAccountButtonText: {
    color: '#D32F2F',
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.medium,
    marginLeft: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionSeparator: {
    height: 1,
    backgroundColor: COLORS.borderPrimary,
    marginVertical: 20,
    marginHorizontal: 10,
  },
  modernDisciplineGroup: {
    marginBottom: 10,
  },
  modernDisciplineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  modernDisciplineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modernCheckbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: COLORS.iconSecondary,
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundPrimary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modernCheckboxSelected: {
    backgroundColor: COLORS.buttonBackgroundPrimary,
    borderColor: COLORS.buttonBackgroundPrimary,
    shadowColor: COLORS.buttonBackgroundPrimary,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  modernDisciplineName: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textPrimary,
    flex: 1,
  },
  modernDisciplineNameSelected: {
    fontFamily: FONTS.sans.bold,
    color: COLORS.buttonBackgroundPrimary,
  },
  followingBadge: {
    backgroundColor: COLORS.success,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 10,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  followingBadgeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.sans.bold,
    letterSpacing: 0.5,
  },
  modernExpandButton: {
    padding: 5,
  },
  modernSubDisciplinesContainer: {
    marginLeft: 30,
    marginTop: 5,
  },
  modernSubDisciplineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    paddingVertical: 3,
  },
  modernSubDisciplineName: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textSecondary,
    flex: 1,
  },
  modernSubDisciplineNameSelected: {
    fontFamily: FONTS.sans.bold,
    color: COLORS.buttonBackgroundPrimary,
  },
  miniFollowingBadge: {
    backgroundColor: COLORS.success,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 10,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  miniFollowingBadgeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.sans.bold,
  },
  minimumGradeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.buttonBackgroundPrimary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  includedGradeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.buttonBackgroundPrimary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  gradeExplanation: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.regular,
    color: '#757575',
    marginTop: 4,
    marginBottom: 4,
    lineHeight: 20,
  },
  labelWithInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoIconButton: {
    padding: 2,
  },
  superModernGradeTextMinimum: {
    fontFamily: FONTS.sans.bold,
    color: COLORS.buttonBackgroundPrimary,
  },
  superModernGradeTextIncluded: {
    fontFamily: FONTS.sans.bold,
    color: COLORS.buttonBackgroundPrimary,
  },
  gradeStatusMinimum: {
    fontFamily: FONTS.sans.bold,
    color: COLORS.buttonBackgroundPrimary,
  },
  gradeStatusIncluded: {
    fontFamily: FONTS.sans.bold,
    color: COLORS.buttonBackgroundPrimary,
  },
  infoButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.iconSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  infoButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.sans.bold,
  },
  gradeInfoContainer: {
    backgroundColor: COLORS.backgroundPrimary,
    borderRadius: 12,
    padding: 18,
    marginTop: 15,
    borderWidth: 1,
    borderColor: COLORS.borderPrimary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gradeInfoTitle: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.bold,
    marginBottom: 10,
    textAlign: 'center',
    color: COLORS.textPrimary,
  },
  gradeInfoItem: {
    marginBottom: 15,
  },
  gradeInfoHeader: {
    flexDirection: 'column',
    marginBottom: 5,
  },
  gradeInfoGrade: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.bold,
    marginLeft: 8,
    color: COLORS.textPrimary,
  },
  gradeInfoLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textSecondary,
  },
  gradeInfoNiveau: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.bold,
    marginBottom: 5,
    color: COLORS.textPrimary,
  },
  gradeInfoDetail: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textSecondary,
    marginLeft: 10,
  },
  modernSelectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderInput,
    borderRadius: 12,
    padding: 15,
    backgroundColor: COLORS.backgroundPrimary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disciplinesContainer: {
    maxHeight: 300,
    borderColor: COLORS.borderPrimary,
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    backgroundColor: COLORS.backgroundPrimary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorContainer: {
    backgroundColor: COLORS.errorBackground || '#ffebee',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  errorText: {
    color: COLORS.errorText || COLORS.error,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.regular,
  },
  successContainer: {
    backgroundColor: COLORS.successBackground || '#e8f5e9',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  successText: {
    color: COLORS.successText || COLORS.success,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.regular,
  },
  deleteAccountContent: {
    padding: 20,
    alignItems: 'center',
  },
  deleteAccountIcon: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  deleteAccountTitle: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.sans.bold,
    marginBottom: 15,
    color: '#D32F2F',
    textAlign: 'center',
  },
  deleteAccountDescription: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 20,
  },
  deleteAccountList: {
    marginBottom: 20,
    alignSelf: 'stretch',
  },
  deleteAccountListItem: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textSecondary,
    marginBottom: 5,
    paddingLeft: 10,
  },
  deleteAccountWarning: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
  deleteAccountButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderPrimary,
  },
  cancelButtonText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.bold,
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: '#D32F2F',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmDeleteButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.bold,
  },
  specialtyHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  specialtyTitleContainer: {
    flexDirection: 'column',
    flex: 1,
  },
  specialtyStats: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cleanResetButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: COLORS.borderPrimary,
    opacity: 0.8,
  },
  resetButtonDisabled: {
    opacity: 0.6,
  },
  resetButtonText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.sans.regular,
    marginLeft: 3,
  },
  resetButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
  summaryContainer: {
    backgroundColor: COLORS.backgroundPrimary,
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.borderPrimary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.bold,
    marginBottom: 10,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  summaryItems: {
    flexDirection: 'column',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    paddingLeft: 10,
  },
  summaryItemText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  disciplineInfo: {
    flex: 1,
  },
  subSpecialtyCount: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  summaryMainItem: {
    marginBottom: 10,
    paddingLeft: 10,
  },
  summaryItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  summaryMainItemText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  specialtyMainBadge: {
    backgroundColor: COLORS.success,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 10,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  specialtyMainBadgeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.sans.bold,
  },
  subSpecialtyInfo: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textSecondary,
    marginLeft: 10,
  },
  summarySubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    paddingLeft: 10,
  },
  summarySubItemText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  specialtySubBadge: {
    backgroundColor: COLORS.buttonBackgroundPrimary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 10,
    shadowColor: COLORS.buttonBackgroundPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  specialtySubBadgeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.sans.bold,
  },
  specialtyStatsModified: {
    color: COLORS.buttonBackgroundPrimary,
    fontFamily: FONTS.sans.bold,
  },
}); 