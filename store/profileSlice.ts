import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  specialty: string;
  date_of_birth: string;
  notification_frequency: string;
  grade_preferences: string[];
  subscriptions: {
    discipline_id: number;
    sub_discipline_id: number | null;
  }[];
}

interface ProfileState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  disciplines: {
    id: number;
    name: string;
    sub_disciplines: {
      id: number;
      name: string;
    }[];
  }[];
  currentSubscriptions: {
    discipline_id: number;
    sub_discipline_id: number | null;
  }[];
  statusOptions: string[];
  notificationOptions: { value: string; label: string; }[];
  saveSuccess: boolean;
}

const initialState: ProfileState = {
  profile: null,
  loading: false,
  error: null,
  disciplines: [],
  currentSubscriptions: [],
  statusOptions: [
    "Pr", "Dr", "Interne", "Étudiant", "Médecine", "Professeur de médecine",
    "Docteur en médecine", "Interne en médecine", "Etudiant en médecine",
    "Diététicien(ne)-nutritionniste", "Infirmier(ère)", "Kinésithérapeute",
    "Pharmaciens", "Professions dentaires", "Psychologue", "Sage-femme", "Autres"
  ],
  notificationOptions: [
    { value: 'tous_les_jours', label: 'Tous les jours' },
    { value: 'tous_les_2_jours', label: 'Tous les 2 jours' },
    { value: 'tous_les_3_jours', label: 'Tous les 3 jours' },
    { value: '1_fois_par_semaine', label: '1 fois par semaine' },
    { value: 'tous_les_15_jours', label: 'Tous les 15 jours' },
    { value: '1_fois_par_mois', label: '1 fois par mois' }
  ],
  saveSuccess: false
};

export const fetchProfile = createAsyncThunk(
  'profile/fetchProfile',
  async (userId: string) => {
    // Fetch user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    // Fetch disciplines
    const { data: disciplines, error: disciplinesError } = await supabase
      .from('disciplines')
      .select(`
        id,
        name,
        sub_disciplines ( id, name )
      `)
      .order('name', { ascending: true });

    if (disciplinesError) throw disciplinesError;

    // Fetch user subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('user_subscriptions')
      .select('discipline_id, sub_discipline_id')
      .eq('user_id', userId);

    if (subsError) throw subsError;

    // Fetch grade preferences
    const { data: gradePreferences, error: gradesError } = await supabase
      .from('user_grade_preferences')
      .select('grade')
      .eq('user_id', userId);

    if (gradesError) throw gradesError;

    return {
      profile: userProfile,
      disciplines,
      subscriptions,
      gradePreferences: gradePreferences.map(g => g.grade)
    };
  }
);

export const updateProfile = createAsyncThunk(
  'profile/updateProfile',
  async ({ 
    userId, 
    profile, 
    subscriptions, 
    gradePreferences 
  }: { 
    userId: string;
    profile: Partial<UserProfile>;
    subscriptions: { discipline_id: number; sub_discipline_id: number | null; }[];
    gradePreferences: string[];
  }) => {
    // 1. Update profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update(profile)
      .eq('id', userId);

    if (profileError) throw profileError;

    // 2. Update grade preferences
    // First delete existing preferences
    const { error: deleteGradesError } = await supabase
      .from('user_grade_preferences')
      .delete()
      .eq('user_id', userId);

    if (deleteGradesError) throw deleteGradesError;

    // Then insert new preferences if any
    if (gradePreferences.length > 0) {
      const gradesToInsert = gradePreferences.map(grade => ({
        user_id: userId,
        grade: grade
      }));

      const { error: insertGradesError } = await supabase
        .from('user_grade_preferences')
        .insert(gradesToInsert);

      if (insertGradesError) throw insertGradesError;
    }

    // 3. Update subscriptions
    // First delete existing subscriptions
    const { error: deleteSubsError } = await supabase
      .from('user_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (deleteSubsError) throw deleteSubsError;

    // Then insert new subscriptions if any
    if (subscriptions.length > 0) {
      const subscriptionRecords = subscriptions.map(sub => ({
        user_id: userId,
        discipline_id: sub.discipline_id,
        sub_discipline_id: sub.sub_discipline_id
      }));

      const { error: insertSubsError } = await supabase
        .from('user_subscriptions')
        .insert(subscriptionRecords);

      if (insertSubsError) throw insertSubsError;
    }

    return { profile, subscriptions, gradePreferences };
  }
);

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    clearSaveSuccess: (state) => {
      state.saveSuccess = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateCurrentSubscriptions: (state, action) => {
      state.currentSubscriptions = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload.profile;
        state.disciplines = action.payload.disciplines;
        state.currentSubscriptions = action.payload.subscriptions;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Une erreur est survenue';
      })
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.saveSuccess = false;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = { ...state.profile, ...action.payload.profile } as UserProfile;
        state.currentSubscriptions = action.payload.subscriptions;
        state.saveSuccess = true;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Une erreur est survenue';
      });
  },
});

export const { clearSaveSuccess, clearError, updateCurrentSubscriptions } = profileSlice.actions;
export default profileSlice.reducer; 