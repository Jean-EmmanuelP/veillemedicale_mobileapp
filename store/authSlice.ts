/**
 * authSlice — Redux state d'auth mobile, 100% Convex Auth.
 *
 * Historique : ce slice était bimodal Supabase ↔ Convex derrière `AUTH_CONVEX_ENABLED`.
 * Depuis que le flag est hardcodé `true` (cf. `lib/authConfig.ts`), toutes les
 * branches OFF sont mortes — elles ont été supprimées.
 *
 * Interface `state.auth.{user, session, isAnonymous, linkingAccount, linkStep}`
 * strictement préservée — les 30+ écrans consommateurs ne sont pas touchés.
 *
 * ⚠️ Le seul usage Supabase restant est `supabase.auth.signInAnonymously()` —
 * Convex Auth n'a pas de mode anonyme. La purge dual (Supabase + Convex) au
 * signOut couvre les sessions résiduelles legacy.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../lib/supabase';
import {
  signInPassword,
  convexSignOut,
  hydrateConvexUserProfile,
  linkNewSignupToMirror,
  getConvexAccessToken,
  type HydratedConvexUser,
} from '../lib/auth/convexAuthClient';

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
 * Après un signIn/signUp Convex Auth réussi : hydrate le profil via userMirror
 * et retourne un payload `{ user, session }` compatible avec l'interface Redux.
 * Le `user.id` reste le supabaseId (via userMirror) pour préserver les 200+
 * index tables métier.
 */
async function buildConvexAuthPayload(): Promise<{ user: HydratedConvexUser; session: { access_token: string | null } }> {
  const hydrated = await hydrateConvexUserProfile();
  const token = await getConvexAccessToken();
  return {
    user: hydrated,
    session: { access_token: token },
  };
}

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const signIn = createAsyncThunk(
  'auth/signIn',
  async ({ email, password }: { email: string; password: string }) => {
    await signInPassword(email, password, { flow: 'signIn' });
    return await buildConvexAuthPayload();
  }
);

export const signUp = createAsyncThunk(
  'auth/signUp',
  async (
    args: { email: string; password: string; firstName?: string; lastName?: string; supabaseId?: string },
  ) => {
    const { email, password, firstName, lastName } = args;
    // Étape 1 : crée le compte Convex Auth (users + authAccounts scrypt).
    await signInPassword(email, password, {
      flow: 'signUp',
      name: [firstName, lastName].filter(Boolean).join(' ') || email,
    });
    // Étape 2 : lie userMirror. Si `supabaseId` fourni (cas guest → permanent),
    // on garde l'uuid existant. Sinon, on utilise convexUserId comme id legacy.
    const token = await getConvexAccessToken();
    let convexUserId = '';
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        convexUserId = payload.sub as string;
      } catch (err) {
        console.warn('[authSlice] signUp: failed to decode JWT', (err as Error).message);
      }
    }
    const idToLink = args.supabaseId || convexUserId;
    await linkNewSignupToMirror({
      supabaseId: idToLink,
      email,
      firstName,
      lastName,
    });
    return await buildConvexAuthPayload();
  }
);

/**
 * Connexion anonyme — TOUJOURS Supabase (Convex Auth n'a pas d'anon).
 * Seul usage `supabase.auth.*` restant côté mobile.
 */
export const signInAnonymously = createAsyncThunk(
  'auth/signInAnonymously',
  async () => {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    return data;
  }
);

/**
 * Étape 1 conversion guest → permanent : lier un email.
 * L'email est juste stocké dans le state ; le signUp Convex se fait à l'étape 2.
 */
export const linkEmailToAnonymousAccount = createAsyncThunk(
  'auth/linkEmailToAnonymousAccount',
  async ({ email }: { email: string }, { getState }) => {
    const state = getState() as { auth: AuthState };
    const currentUser = state.auth.user;
    return {
      user: { ...currentUser, email, _pendingLinkEmail: email },
    };
  }
);

/**
 * Étape 2 conversion guest → permanent : ajouter un mot de passe.
 * SignUp Convex Auth complet + linkNewSignup avec l'uuid du guest (préservé
 * pour la continuité des données).
 */
export const addPasswordToVerifiedAccount = createAsyncThunk(
  'auth/addPasswordToVerifiedAccount',
  async ({ password }: { password: string }, { getState }) => {
    const state = getState() as { auth: AuthState };
    const currentUser = state.auth.user;
    const email: string | undefined = currentUser?._pendingLinkEmail || currentUser?.email;
    const guestId: string | undefined = currentUser?.id;
    if (!email) {
      throw new Error('addPasswordToVerifiedAccount: email absent. Appelle `linkEmailToAnonymousAccount` d\'abord.');
    }
    if (!guestId) {
      throw new Error('addPasswordToVerifiedAccount: guest id absent.');
    }
    // 1. Sign out Supabase (déconnexion du compte anonyme legacy).
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[authSlice] signOut Supabase guest failed (ignoré):', (err as Error).message);
    }
    // 2. SignUp Convex Auth + link userMirror avec le supabaseId guest.
    await signInPassword(email, password, { flow: 'signUp' });
    await linkNewSignupToMirror({
      supabaseId: guestId,
      email,
    });
    return await buildConvexAuthPayload();
  }
);

/**
 * Convex Auth ne fait pas de vérification email — le compte est actif dès signup.
 * On retourne l'user courant pour préserver l'interface.
 */
export const checkEmailVerificationStatus = createAsyncThunk(
  'auth/checkEmailVerificationStatus',
  async (_, { getState }) => {
    const state = getState() as { auth: AuthState };
    return state.auth.user;
  }
);

export const signOut = createAsyncThunk('auth/signOut', async () => {
  // Best-effort dual purge : Convex Auth + purge Supabase legacy (session anon).
  try {
    await convexSignOut();
  } catch (err) {
    console.warn('[authSlice] convexSignOut failed:', (err as Error).message);
  }
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('[authSlice] supabase.signOut failed (ignoré):', (err as Error).message);
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
      .addCase(signInAnonymously.pending, (state) => {
        state.loading = true;
        state.error = null;
        console.log('⏳ [AUTH] signInAnonymously.pending');
      })
      .addCase(signInAnonymously.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.isAnonymous = true;
        state.linkStep = 'idle';
        state.linkingAccount = false;
        state.error = null;
        console.log('✅ [AUTH] signInAnonymously.fulfilled:', {
          userId: action.payload.user?.id,
          isAnonymous: true,
        });
      })
      .addCase(signInAnonymously.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur de connexion anonyme';
        console.log('❌ [AUTH] signInAnonymously.rejected:', action.error.message);
      })
      .addCase(linkEmailToAnonymousAccount.pending, (state) => {
        state.linkingAccount = true;
        state.error = null;
      })
      .addCase(linkEmailToAnonymousAccount.fulfilled, (state, action) => {
        state.linkingAccount = false;
        state.linkStep = 'email-sent';
        if ((action.payload as any)?.user) {
          state.user = (action.payload as any).user;
        }
        console.log('✅ [AUTH] linkEmailToAnonymousAccount.fulfilled:', {
          email: (action.payload as any)?.user?.email,
          linkStep: state.linkStep,
        });
      })
      .addCase(linkEmailToAnonymousAccount.rejected, (state, action) => {
        state.linkingAccount = false;
        state.error = action.error.message || 'Erreur lors de la liaison de l\'email';
      })
      .addCase(addPasswordToVerifiedAccount.pending, (state) => {
        state.linkingAccount = true;
        state.error = null;
      })
      .addCase(addPasswordToVerifiedAccount.fulfilled, (state, action) => {
        state.linkingAccount = false;
        state.linkStep = 'password-set';
        state.isAnonymous = false;
        state.user = (action.payload as any)?.user ?? state.user;
        if ((action.payload as any)?.session) {
          state.session = (action.payload as any).session;
        }
        console.log('✅ [AUTH] addPasswordToVerifiedAccount.fulfilled: guest converted');
      })
      .addCase(addPasswordToVerifiedAccount.rejected, (state, action) => {
        state.linkingAccount = false;
        state.error = action.error.message || 'Erreur lors de l\'ajout du mot de passe';
      })
      .addCase(checkEmailVerificationStatus.fulfilled, (state, action) => {
        if ((action.payload as any)?.email_confirmed_at) {
          state.linkStep = 'email-verified';
        }
        if (action.payload) state.user = action.payload;
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
