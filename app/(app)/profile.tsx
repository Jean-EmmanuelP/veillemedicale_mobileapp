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
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setUser, setSession } from '../../store/authSlice';
import { fetchProfile, updateProfile, clearSaveSuccess } from '../../store/profileSlice';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      dispatch(setUser(null));
      dispatch(setSession(null));
      router.replace('/login');
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors de la déconnexion');
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
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors de la mise à jour du profil');
    }
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
              <Ionicons name="close" size={24} color="#000" />
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
              <Ionicons name="close" size={24} color="#000" />
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

  if (loading && !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Mon compte</Text>

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
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nom</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Votre nom"
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
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Spécialité</Text>
            <TextInput
              style={styles.input}
              value={specialty}
              onChangeText={setSpecialty}
              placeholder="Ex: Médecine Générale"
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
              <Ionicons name="calendar" size={20} color="#666" />
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
              <Ionicons name="chevron-down" size={20} color="#666" />
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
                  <Text
                    style={[
                      styles.gradeButtonText,
                      selectedGrades.includes(grade) && styles.gradeButtonTextSelected,
                    ]}
                  >
                    Grade {grade}
                  </Text>
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
                    <Text style={styles.gradeInfoGrade}>Grade {info.grade}</Text>
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
                      style={styles.disciplineCheckbox}
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
                          color="#666"
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
            <ActivityIndicator color="#fff" />
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
      </ScrollView>

      {renderStatusModal()}
      {renderNotificationModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#000',
  },
  section: {
    marginBottom: 30,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000',
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    backgroundColor: '#fff',
  },
  selectButtonText: {
    fontSize: 16,
    color: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalItemText: {
    fontSize: 16,
    color: '#000',
  },
  modalItemTextSelected: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  gradeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  gradeButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginHorizontal: 5,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  gradeButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  gradeButtonText: {
    color: '#666',
  },
  gradeButtonTextSelected: {
    color: '#fff',
  },
  infoButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  infoButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  gradeInfoContainer: {
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 15,
    marginTop: 10,
  },
  gradeInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  gradeInfoItem: {
    marginBottom: 15,
  },
  gradeInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  gradeInfoGrade: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  gradeInfoLabel: {
    fontSize: 14,
    color: '#666',
  },
  gradeInfoNiveau: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  gradeInfoDetail: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  disciplinesContainer: {
    maxHeight: 300,
  },
  disciplineGroup: {
    marginBottom: 10,
  },
  disciplineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  disciplineCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 3,
    marginRight: 10,
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  disciplineName: {
    fontSize: 16,
    color: '#000',
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
  },
  subDisciplineName: {
    fontSize: 14,
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 15,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#ff3b30',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  successContainer: {
    backgroundColor: '#e8f5e9',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  successText: {
    color: '#2e7d32',
    fontSize: 14,
  },
}); 