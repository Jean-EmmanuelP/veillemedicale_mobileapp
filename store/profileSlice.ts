import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../lib/supabase';
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
  async (userId: string) => {
    console.log('📋 [PROFILE SLICE] fetchProfile started for userId:', userId);

    // ─── 1. User profile via Convex `userMirror` (source de vérité mobile) ───
    // Migration Supabase → Convex : on ne tape plus la table `user_profiles`
    // Supabase directement. `userMirror` est synchro par webhook + cron
    // `sync-user-mirror`. Cf. `convex/userMirror.ts`.
    const mirror = await withTimeout(
      convex.query(api.userMirror.getBySupabaseId, { supabaseId: userId }),
      FETCH_TIMEOUT_MS,
      'convex.userMirror.getBySupabaseId'
    );

    if (!mirror) {
      throw new Error(
        `Profil introuvable dans Convex userMirror pour userId=${userId}. Le sync backend a peut-être du retard — réessayez dans quelques secondes.`
      );
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

    // ─── 2. Disciplines + subscriptions + grades — 100% Convex ──────────────
    // Migration finale 2026-07-03 : les 3 dernières tables Supabase (disciplines,
    // user_subscriptions, user_grade_preferences) sont maintenant servies par
    // Convex via `getMobileProfileRelations` (query combinée = 1 seul RTT).
    //
    // Le mobile est désormais 100% Convex — plus aucune référence Supabase active.
    const relations = await withTimeout(
      convex.query(api.articles.getMobileProfileRelations, { userId }),
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
    // TODO(convex): pas encore de mutation Convex publique équivalente à
    // `updateProfile` — on garde Supabase update en attendant. Les writes ici
    // seront répliqués vers Convex par le webhook `upsertFromSupabase`.
    console.log('📝 [PROFILE SLICE] Updating profile:', profile);
    // supabase-js query builders sont thenables mais pas Promise natives ; on
    // les wrappe explicitement pour que withTimeout puisse les racer.
    const profileUpdateResult = (await withTimeout(
      Promise.resolve(
        supabase.from('user_profiles').update(profile).eq('id', userId)
      ),
      FETCH_TIMEOUT_MS,
      'supabase update user_profiles'
    )) as { error: any };
    const profileError = profileUpdateResult.error;

    if (profileError) {
      console.error('❌ [PROFILE SLICE] Error updating profile:', profileError);
      throw profileError;
    }

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
