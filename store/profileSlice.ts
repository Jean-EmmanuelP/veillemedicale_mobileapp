import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { convex, api } from '../lib/convex';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  specialty: string;
  date_of_birth: string;
  notification_frequency: string;
  minimum_grade_notification: string;
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

/**
 * withTimeout — enveloppe une Promise dans un Promise.race avec un timeout.
 * Si le timeout expire, la promise rejette avec un message explicite. Ça
 * garantit qu'aucun fetch bloqué ne peut geler l'UI en `loading: true` à vie.
 */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`[TIMEOUT] ${label} n'a pas répondu en ${ms / 1000}s`)),
        ms
      )
    ),
  ]);
}

const FETCH_TIMEOUT_MS = 10_000;

export const fetchProfile = createAsyncThunk(
  'profile/fetchProfile',
  // `userId` n'est plus envoyé au serveur : le profil est celui de la session Convex Auth.
  async (userId: string) => {
    console.log('📋 [PROFILE SLICE] fetchProfile started for userId:', userId);

    // ─── 1. Profil de l'utilisateur authentifié (`userMirror.me`) ───────────
    const mirror = await withTimeout(
      convex.query(api.userMirror.me, {}),
      FETCH_TIMEOUT_MS,
      'convex.userMirror.me'
    );

    if (!mirror) {
      throw new Error('Profil introuvable — session expirée ? Reconnectez-vous.');
    }

    // Shape adapté à l'interface UserProfile (snake_case côté mobile pour compat
    // avec les composants existants qui lisent `first_name`, `date_of_birth`, ...).
    const userProfile: UserProfile = {
      id: mirror.supabaseId,
      first_name: mirror.firstName || '',
      last_name: mirror.lastName || '',
      email: mirror.email || '',
      status: mirror.status || '',
      specialty: mirror.specialty || '',
      date_of_birth: mirror.dateOfBirth || '',
      notification_frequency: mirror.notificationFrequency || 'tous_les_jours',
      minimum_grade_notification: mirror.minimumGradeNotification || '',
      grade_preferences: [], // rempli plus bas
      subscriptions: [],     // rempli plus bas
    };

    console.log('✅ [PROFILE SLICE] Convex userMirror fetched:', {
      userId: userProfile.id,
      firstName: userProfile.first_name,
      email: userProfile.email,
    });

    // ─── 2. Disciplines + subscriptions + grades (1 seul RTT) ───────────────
    const relations = await withTimeout(
      convex.query(api.articles.getMobileProfileRelations, {}),
      FETCH_TIMEOUT_MS,
      'convex profile relations (disciplines/subs/grades)'
    );

    const disciplines = relations?.disciplines ?? [];
    const subscriptions = relations?.subscriptions ?? [];
    const gradePreferences = relations?.gradePreferences ?? [];

    userProfile.grade_preferences = gradePreferences;
    userProfile.subscriptions = subscriptions;

    console.log('🎉 [PROFILE SLICE] fetchProfile completed:', {
      disciplinesCount: disciplines.length,
      subscriptionsCount: subscriptions.length,
      gradesCount: gradePreferences.length,
    });

    return {
      profile: userProfile,
      disciplines,
      subscriptions,
      gradePreferences,
    };
  }
);

export const updateProfile = createAsyncThunk(
  'profile/updateProfile',
  async ({
    profile,
    subscriptions,
    gradePreferences
  }: {
    userId?: string;
    profile: Partial<UserProfile>;
    subscriptions: { discipline_id: number; sub_discipline_id: number | null; }[];
    gradePreferences: string[];
  }) => {
    // Profil + abonnements + grades de l'utilisateur authentifié, en une mutation.
    console.log('📝 [PROFILE SLICE] Updating profile:', profile);
    await withTimeout(
      convex.mutation(api.userMirror.updateMyProfile, {
        ...(profile.first_name !== undefined ? { firstName: profile.first_name } : {}),
        ...(profile.last_name !== undefined ? { lastName: profile.last_name } : {}),
        ...(profile.status !== undefined ? { status: profile.status || null } : {}),
        ...(profile.specialty !== undefined ? { specialty: profile.specialty || null } : {}),
        ...(profile.date_of_birth !== undefined ? { dateOfBirth: profile.date_of_birth || null } : {}),
        ...(profile.notification_frequency ? { notificationFrequency: profile.notification_frequency } : {}),
        ...(profile.minimum_grade_notification ? { minimumGradeNotification: profile.minimum_grade_notification } : {}),
        subscriptions: subscriptions
          .filter((sub) => sub.discipline_id)
          .map((sub) => ({ disciplineId: sub.discipline_id, subDisciplineId: sub.sub_discipline_id })),
        grades: gradePreferences,
      }),
      FETCH_TIMEOUT_MS,
      'convex.userMirror.updateMyProfile'
    );

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
        console.log('⏳ [PROFILE SLICE] fetchProfile.pending: Loading profile...');
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload.profile;
        state.disciplines = action.payload.disciplines;
        state.currentSubscriptions = action.payload.subscriptions;
        console.log('✅ [PROFILE SLICE] fetchProfile.fulfilled: Profile loaded in Redux state:', {
          profileId: action.payload.profile.id,
          firstName: action.payload.profile.first_name,
          email: action.payload.profile.email,
          disciplinesCount: action.payload.disciplines.length,
          subscriptionsCount: action.payload.subscriptions.length
        });
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;

        // Ne pas afficher l'erreur "no rows returned" pour les utilisateurs anonymes
        const errorMessage = action.error.message || '';
        const isNoRowsError = errorMessage.includes('JSON object requested') &&
                             (errorMessage.includes('multiple') || errorMessage.includes('no rows'));

        if (isNoRowsError) {
          console.log('🔇 [PROFILE SLICE] fetchProfile.rejected: Suppressing "no rows" error (likely anonymous user)');
          state.error = null; // Ne pas afficher l'erreur
        } else {
          console.error('❌ [PROFILE SLICE] fetchProfile.rejected:', errorMessage);
          state.error = errorMessage || 'Une erreur est survenue';
        }
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
