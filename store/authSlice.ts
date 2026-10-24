/**
 * authSlice — Redux state d'auth mobile, basé sur Convex Auth (seul mécanisme).
 *
 * Interface `state.auth.{user, session, isAnonymous, linkingAccount, linkStep}`
 * préservée pour les écrans consommateurs. Le mode invité (session anonyme
 * Supabase) a été retiré : `isAnonymous` vaut toujours `false`.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  signInPassword,
  convexSignOut,
  hydrateConvexUserProfile,
  getConvexAccessToken,
  type HydratedConvexUser,
} from '../lib/auth/convexAuthClient';
import NotificationService from '../services/NotificationService';

// ─── State ────────────────────────────────────────────────────────────────────

interface AuthState {
  user: any | null;
  session: any | null;
  loading: boolean;
  error: string | null;
  isAnonymous: boolean;
  linkingAccount: boolean;
  linkStep: 'idle' | 'email-sent' | 'email-verified' | 'password-set';
}

const initialState: AuthState = {
  user: null,
  session: null,
  loading: false,
  error: null,
  isAnonymous: false,
  linkingAccount: false,
  linkStep: 'idle',
};

// ─── Adaptateur Convex → shape Redux ──────────────────────────────────────────

/**
 * Après un signIn/signUp Convex Auth réussi : charge le profil (`userMirror.me`)
 * et retourne un payload `{ user, session }` compatible avec l'interface Redux.
 */
async function buildConvexAuthPayload(): Promise<{ user: HydratedConvexUser; session: { access_token: string | null } }> {
  const hydrated = await hydrateConvexUserProfile();
  const token = await getConvexAccessToken();
  return {
    user: hydrated,
    session: { access_token: token },
  };
}

/** Message utilisateur pour les erreurs Convex Auth (codes renvoyés par le serveur). */
export function authErrorMessage(err: unknown, fallback: string): string {
  const msg = (err as Error)?.message ?? '';
  if (msg.includes('AccountAlreadyExists')) {
    return 'Un compte existe déjà avec cet email. Connectez-vous ou réinitialisez votre mot de passe.';
  }
  if (msg.includes('InvalidSecret') || msg.includes('InvalidAccountId')) {
    return 'Email ou mot de passe incorrect.';
  }
  if (msg.includes('TooManyFailedAttempts') || msg.includes('rate')) {
    return 'Trop de tentatives. Réessayez dans quelques minutes.';
  }
  if (msg.includes('Invalid password')) {
    return 'Mot de passe invalide (8 caractères minimum).';
  }
  if (msg.toLowerCase().includes('code')) {
    return 'Code invalide ou expiré.';
  }
  return fallback;
}

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const signIn = createAsyncThunk(
  'auth/signIn',
  async ({ email, password }: { email: string; password: string }) => {
    await signInPassword(email.trim().toLowerCase(), password, { flow: 'signIn' });
    return await buildConvexAuthPayload();
  }
);

/**
 * Inscription : crée le compte Convex Auth. Le profil `userMirror` (uuid +
 * email de bienvenue) est créé côté serveur par `afterUserCreatedOrUpdated`.
 * Les préférences sont ensuite posées via `userMirror.updateMyProfile`.
 */
export const signUp = createAsyncThunk(
  'auth/signUp',
  async (args: { email: string; password: string; firstName?: string; lastName?: string }) => {
    const { email, password, firstName, lastName } = args;
    await signInPassword(email.trim().toLowerCase(), password, {
      flow: 'signUp',
      name: [firstName, lastName].filter(Boolean).join(' ') || email,
    });
    return await buildConvexAuthPayload();
  }
);

/** Déconnexion : révoque la session Convex et purge les tokens SecureStore. */
export const signOut = createAsyncThunk('auth/signOut', async () => {
  const notifications = NotificationService.getInstance();
  await notifications.unregisterPushToken();
  notifications.resetInitState();
  try {
    await convexSignOut();
  } catch (err) {
    console.warn('[authSlice] convexSignOut failed:', (err as Error).message);
  }
});

// ─── Slice ────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      if (action.payload) {
        const wasAnonymous = state.isAnonymous;
        state.isAnonymous = action.payload.is_anonymous === true;
        console.log('🔵 [AUTH] setUser:', {
          userId: action.payload.id,
          email: action.payload.email,
          isAnonymous: state.isAnonymous,
          isAnonymousFromPayload: action.payload.is_anonymous,
          wasAnonymous,
          userMetadata: action.payload.user_metadata,
          appMetadata: action.payload.app_metadata,
        });
      } else {
        state.isAnonymous = false;
        console.log('🔵 [AUTH] setUser: User cleared (logout)');
      }
    },
    setSession: (state, action) => {
      state.session = action.payload;
      // Convex Auth : les JWT n'ont pas de claim `is_anonymous`. On dérive de
      // `state.user.is_anonymous` (setté par setUser).
      if (state.user) {
        state.isAnonymous = state.user.is_anonymous === true;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    resetLinkProcess: (state) => {
      state.linkingAccount = false;
      state.linkStep = 'idle';
      state.error = null;
    },
    updateUserAnonymousStatus: (state, action) => {
      state.isAnonymous = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signIn.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.isAnonymous = (action.payload.user as any)?.is_anonymous === true;
        console.log('✅ [AUTH] signIn.fulfilled:', {
          userId: (action.payload.user as any)?.id,
          email: (action.payload.user as any)?.email,
          isAnonymous: state.isAnonymous,
        });
      })
      .addCase(signIn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur de connexion';
        console.log('❌ [AUTH] signIn.rejected:', action.error.message);
      })
      .addCase(signUp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signUp.fulfilled, (state, action) => {
        state.loading = false;
        state.user = (action.payload as any).user;
        state.session = (action.payload as any).session;
        state.isAnonymous = false;
      })
      .addCase(signUp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur lors de l\'inscription';
      })
      .addCase(signOut.pending, (state) => {
        state.loading = true;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.session = null;
        state.isAnonymous = false;
        state.linkStep = 'idle';
        state.linkingAccount = false;
        state.error = null;
        console.log('✅ [AUTH] signOut.fulfilled');
      })
      .addCase(signOut.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur lors de la déconnexion';
      });
  },
});

export const {
  setUser,
  setSession,
  clearError,
  updateUserAnonymousStatus,
  resetLinkProcess,
} = authSlice.actions;

export default authSlice.reducer;
