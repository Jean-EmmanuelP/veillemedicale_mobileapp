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
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { COLORS } from '../assets/constants/colors';
import { FONTS, FONT_SIZES } from '../assets/constants/fonts';
import NotificationService from '../services/NotificationService';
import { BlurView } from 'expo-blur';
import { renderGradeStars } from '../utils/gradeStars';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
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
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [currentSubscriptionsSet, setCurrentSubscriptionsSet] = useState<Set<string>>(new Set());
  const [openDisciplines, setOpenDisciplines] = useState<Set<number>>(new Set());

  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
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
    if (user?.id) {
      dispatch(fetchProfile(user.id));
    }
  }, [user?.id]);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setStatus(profile.status || '');
      setSpecialty(profile.specialty || '');
      setDateOfBirth(profile.date_of_birth || '');
      setNotificationFrequency(profile.notification_frequency || 'tous_les_jours');
      setSelectedGrades(profile.grade_preferences || []);
    }
  }, [profile]);

  useEffect(() => {
    // Convertir les abonnements en Set pour une recherche plus rapide
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
    setOpenDisciplines(openDisciplinesSet);
  }, [currentSubscriptions]);

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
      dispatch(setUser(null));
      dispatch(setSession(null));
      router.replace('/(auth)');
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
      await dispatch(updateProfile({
        userId: user.id,
        profile: {
          first_name: firstName,
          last_name: lastName,
          status,
          specialty,
          date_of_birth: dateOfBirth,
          notification_frequency: notificationFrequency,
        },
        subscriptions,
        gradePreferences: selectedGrades,
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
    setSending(true);
    try {
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
    if (!targetUserId) {
      Alert.alert('Erreur', 'Veuillez saisir un ID utilisateur');
      return;
    }
    setSending(true);
    try {
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
    
    if (isChecked) {
      newSubs.add(`d:${disciplineId}`);
      discipline?.sub_disciplines.forEach(sub => {
        newSubs.add(`s:${sub.id}`);
      });
      setOpenDisciplines(prev => new Set([...prev, disciplineId]));
    } else {
      newSubs.delete(`d:${disciplineId}`);
      discipline?.sub_disciplines.forEach(sub => {
        newSubs.delete(`s:${sub.id}`);
      });
    }
    setCurrentSubscriptionsSet(newSubs);
  };

  const handleSubDisciplineChange = (subDisciplineId: number, disciplineId: number, isChecked: boolean) => {
    const newSubs = new Set(currentSubscriptionsSet);
    if (isChecked) {
      newSubs.add(`s:${subDisciplineId}`);
      if (!newSubs.has(`d:${disciplineId}`)) {
        newSubs.add(`d:${disciplineId}`);
      }
    } else {
      newSubs.delete(`s:${subDisciplineId}`);
    }
    setCurrentSubscriptionsSet(newSubs);
  };

  const handleGradeChange = (grade: string, isChecked: boolean) => {
    const newGrades = new Set(selectedGrades);
    if (isChecked) {
      newGrades.add(grade);
    } else {
      newGrades.delete(grade);
    }
    setSelectedGrades(Array.from(newGrades));
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vos informations</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Prénom</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Votre prénom"
              placeholderTextColor={COLORS.textPlaceholder}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nom</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Votre nom"
              placeholderTextColor={COLORS.textPlaceholder}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Statut</Text>
            <TouchableOpacity
              style={styles.selectButton}
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
              style={styles.input}
              value={specialty}
              onChangeText={setSpecialty}
              placeholder="Ex: Médecine Générale"
              placeholderTextColor={COLORS.textPlaceholder}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Date de naissance</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.selectButtonText}>
                {dateOfBirth || 'Choisir une date'}
              </Text>
              <Ionicons name="calendar" size={20} color={COLORS.iconSecondary} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={dateOfBirth ? new Date(dateOfBirth) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setDateOfBirth(selectedDate.toISOString().split('T')[0]);
                  }
                }}
              />
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vos préférences de veille</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Fréquence des notifications</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowNotificationModal(true)}
            >
              <Text style={styles.selectButtonText}>
                {notificationOptions.find(opt => opt.value === notificationFrequency)?.label || 'Choisir une fréquence'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.iconSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Grades de recommandation souhaités
              <TouchableOpacity
                onPress={() => setShowGradeInfo(!showGradeInfo)}
                style={styles.infoButton}
              >
                <Text style={styles.infoButtonText}>i</Text>
              </TouchableOpacity>
            </Text>
            <View style={styles.gradeContainer}>
              {['A', 'B', 'C'].map((grade) => (
                <TouchableOpacity
                  key={grade}
                  style={[
                    styles.gradeButton,
                    selectedGrades.includes(grade) && styles.gradeButtonSelected,
                  ]}
                  onPress={() => handleGradeChange(grade, !selectedGrades.includes(grade))}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {renderGradeStars(grade, 14)}
                    <Text
                      style={[
                        styles.gradeButtonText,
                        selectedGrades.includes(grade) && styles.gradeButtonTextSelected,
                      ]}
                    >
                      {grade}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
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
            <Text style={styles.label}>Spécialités et sous-spécialités suivies</Text>
            <ScrollView style={styles.disciplinesContainer}>
              {disciplines.map((discipline) => (
                <View key={discipline.id} style={styles.disciplineGroup}>
                  <View style={styles.disciplineHeader}>
                    <TouchableOpacity
                      style={styles.disciplineCheckboxContainer}
                      onPress={() => handleMainDisciplineChange(
                        discipline.id,
                        !currentSubscriptionsSet.has(`d:${discipline.id}`)
                      )}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          currentSubscriptionsSet.has(`d:${discipline.id}`) &&
                            styles.checkboxSelected,
                        ]}
                      />
                      <Text style={styles.disciplineName}>{discipline.name}</Text>
                    </TouchableOpacity>
                    {discipline.sub_disciplines.length > 0 && (
                      <TouchableOpacity
                        onPress={() => toggleDisciplineSection(discipline.id)}
                        style={styles.expandButton}
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
                      <View style={styles.subDisciplinesContainer}>
                        {discipline.sub_disciplines.map((sub) => (
                          <TouchableOpacity
                            key={sub.id}
                            style={styles.subDisciplineItem}
                            onPress={() =>
                              handleSubDisciplineChange(
                                sub.id,
                                discipline.id,
                                !currentSubscriptionsSet.has(`s:${sub.id}`)
                              )
                            }
                          >
                            <View
                              style={[
                                styles.checkbox,
                                currentSubscriptionsSet.has(`s:${sub.id}`) &&
                                  styles.checkboxSelected,
                              ]}
                            />
                            <Text style={styles.subDisciplineName}>
                              {sub.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.textOnPrimaryButton} />
          ) : (
            <Text style={styles.saveButtonText}>Enregistrer les modifications</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={loading}
        >
          <Text style={styles.logoutButtonText}>Déconnexion</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={() => setShowDeleteAccountModal(true)}
          disabled={loading}
        >
          <Text style={styles.deleteAccountButtonText}>Supprimer mon compte</Text>
        </TouchableOpacity>
      </ScrollView>

      {renderStatusModal()}
      {renderNotificationModal()}
      {renderDeleteAccountModal()}
      {renderAdminModal()}
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
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 10,
    padding: 15,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.sans.bold,
    marginBottom: 15,
    color: COLORS.textPrimary,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.regular,
    marginBottom: 5,
    color: COLORS.textSecondary,
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
    marginTop: 10,
  },
  gradeButton: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.borderInput,
    borderRadius: 5,
    marginHorizontal: 5,
    alignItems: 'center',
    backgroundColor: COLORS.backgroundPrimary,
    minHeight: 44,
    justifyContent: 'center',
  },
  gradeButtonSelected: {
    backgroundColor: COLORS.buttonBackgroundPrimary,
    borderColor: COLORS.buttonBackgroundPrimary,
  },
  gradeButtonText: {
    fontFamily: FONTS.sans.regular,
    color: COLORS.textPrimary,
    marginLeft: 4,
    fontSize: 12,
  },
  gradeButtonTextSelected: {
    fontFamily: FONTS.sans.regular,
    color: COLORS.buttonTextPrimary,
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
    borderRadius: 5,
    padding: 15,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.borderPrimary,
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
  disciplinesContainer: {
    maxHeight: 300,
    borderColor: COLORS.borderPrimary,
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    backgroundColor: COLORS.backgroundPrimary,
  },
  disciplineGroup: {
    marginBottom: 10,
  },
  disciplineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  disciplineCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: COLORS.iconSecondary,
    borderRadius: 3,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.buttonBackgroundPrimary,
    borderColor: COLORS.buttonBackgroundPrimary,
  },
  disciplineName: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textPrimary,
  },
  expandButton: {
    padding: 5,
  },
  subDisciplinesContainer: {
    marginLeft: 30,
    marginTop: 5,
  },
  subDisciplineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    paddingVertical: 3,
  },
  subDisciplineName: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textSecondary,
  },
  saveButton: {
    backgroundColor: COLORS.buttonBackgroundPrimary,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 15,
  },
  saveButtonText: {
    color: COLORS.buttonTextPrimary,
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.bold,
  },
  logoutButton: {
    backgroundColor: COLORS.backgroundSecondary,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderPrimary,
  },
  logoutButtonText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.bold,
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
  deleteAccountButton: {
    backgroundColor: '#FFEBEE',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D32F2F',
    marginTop: 10,
  },
  deleteAccountButtonText: {
    color: '#D32F2F',
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.bold,
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
}); 