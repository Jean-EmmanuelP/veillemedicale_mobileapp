import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: any | null;
  session: any | null;
  loading: boolean;
  error: string | null;
  isAnonymous: boolean; // Pour distinguer les comptes guest
  linkingAccount: boolean; // Pour indiquer si on est en train de lier le compte
  linkStep: 'idle' | 'email-sent' | 'email-verified' | 'password-set'; // Étapes de liaison
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

export const signIn = createAsyncThunk(
  'auth/signIn',
  async ({ email, password }: { email: string; password: string }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }
);

export const signUp = createAsyncThunk(
  'auth/signUp',
  async ({ email, password }: { email: string; password: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }
);

// Connexion anonyme
export const signInAnonymously = createAsyncThunk(
  'auth/signInAnonymously',
  async () => {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    return data;
  }
);

// Lier un email à un compte anonyme (Étape 1)
export const linkEmailToAnonymousAccount = createAsyncThunk(
  'auth/linkEmailToAnonymousAccount',
  async ({ email }: { email: string }) => {
    // Selon la documentation Supabase, on utilise updateUser pour lier l'email
    const { data, error } = await supabase.auth.updateUser({
      email: email,
    });
    if (error) throw error;
    return data;
  }
);

// Ajouter un mot de passe après vérification de l'email (Étape 2)
export const addPasswordToVerifiedAccount = createAsyncThunk(
  'auth/addPasswordToVerifiedAccount',
  async ({ password }: { password: string }) => {
    // L'email doit être vérifié avant d'ajouter le mot de passe
    const { data, error } = await supabase.auth.updateUser({
      password: password,
    });
    if (error) throw error;
    return data;
  }
);

// Vérifier le statut de vérification de l'email
export const checkEmailVerificationStatus = createAsyncThunk(
  'auth/checkEmailVerificationStatus',
  async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  }
);

export const signOut = createAsyncThunk('auth/signOut', async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      // Amélioration : détecter l'état anonyme depuis les métadonnées utilisateur
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
          appMetadata: action.payload.app_metadata
        });
      } else {
        state.isAnonymous = false;
        console.log('🔵 [AUTH] setUser: User cleared (logout)');
      }
    },
    setSession: (state, action) => {
      state.session = action.payload;
      // Vérifier le claim is_anonymous dans le JWT
      if (action.payload?.access_token) {
        try {
          const payload = JSON.parse(atob(action.payload.access_token.split('.')[1]));
          state.isAnonymous = payload.is_anonymous === true;
          console.log('🔵 [AUTH] setSession JWT payload:', {
            isAnonymous: payload.is_anonymous,
            role: payload.role,
            userId: payload.sub,
            email: payload.email
          });
        } catch (e) {
          // En cas d'erreur de parsing, vérifier via l'utilisateur
          if (state.user) {
            state.isAnonymous = state.user.is_anonymous === true;
          }
          console.log('🔵 [AUTH] setSession: Error parsing JWT, fallback to user metadata');
        }
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    // Reset du processus de liaison
    resetLinkProcess: (state) => {
      state.linkingAccount = false;
      state.linkStep = 'idle';
      state.error = null;
    },
    // Mise à jour manuelle du statut anonyme
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
        state.isAnonymous = action.payload.user?.is_anonymous === true;
        console.log('✅ [AUTH] signIn.fulfilled:', {
          userId: action.payload.user?.id,
          email: action.payload.user?.email,
          isAnonymous: state.isAnonymous
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
        console.log('⏳ [AUTH] signInAnonymously.pending: Starting anonymous sign in...');
      })
      .addCase(signInAnonymously.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.isAnonymous = true; // Toujours true pour les connexions anonymes
        // IMPORTANT: Reset du processus de liaison pour chaque nouvel utilisateur anonyme
        state.linkStep = 'idle';
        state.linkingAccount = false;
        state.error = null;
        console.log('✅ [AUTH] signInAnonymously.fulfilled:', {
          userId: action.payload.user?.id,
          email: action.payload.user?.email || 'No email (anonymous)',
          isAnonymous: true,
          linkStep: state.linkStep,
          sessionId: action.payload.session?.access_token?.substring(0, 20) + '...'
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
        console.log('⏳ [AUTH] linkEmailToAnonymousAccount.pending: Linking email...');
      })
      .addCase(linkEmailToAnonymousAccount.fulfilled, (state, action) => {
        state.linkingAccount = false;
        state.linkStep = 'email-sent';
        console.log('✅ [AUTH] linkEmailToAnonymousAccount.fulfilled:', {
          userId: action.payload.user?.id,
          email: action.payload.user?.email,
          linkStep: state.linkStep
        });
        // L'utilisateur reste anonyme jusqu'à ce que le processus soit complet
      })
      .addCase(linkEmailToAnonymousAccount.rejected, (state, action) => {
        state.linkingAccount = false;
        state.error = action.error.message || 'Erreur lors de la liaison de l\'email';
        console.log('❌ [AUTH] linkEmailToAnonymousAccount.rejected:', action.error.message);
      })
      .addCase(addPasswordToVerifiedAccount.pending, (state) => {
        state.linkingAccount = true;
        state.error = null;
        console.log('⏳ [AUTH] addPasswordToVerifiedAccount.pending: Adding password...');
      })
      .addCase(addPasswordToVerifiedAccount.fulfilled, (state, action) => {
        state.linkingAccount = false;
        state.linkStep = 'password-set';
        state.isAnonymous = false; // Plus anonyme après avoir ajouté le mot de passe
        state.user = action.payload.user;
        console.log('✅ [AUTH] addPasswordToVerifiedAccount.fulfilled - ACCOUNT CONVERTED:', {
          userId: action.payload.user?.id,
          email: action.payload.user?.email,
          isAnonymous: state.isAnonymous,
          linkStep: state.linkStep,
          message: 'Guest account successfully converted to permanent account!'
        });
      })
      .addCase(addPasswordToVerifiedAccount.rejected, (state, action) => {
        state.linkingAccount = false;
        state.error = action.error.message || 'Erreur lors de l\'ajout du mot de passe';
        console.log('❌ [AUTH] addPasswordToVerifiedAccount.rejected:', action.error.message);
      })
      .addCase(checkEmailVerificationStatus.fulfilled, (state, action) => {
        if (action.payload.email_confirmed_at) {
          state.linkStep = 'email-verified';
        }
        state.user = action.payload;
      })
      .addCase(signUp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signUp.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.session = action.payload.session;
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
        console.log('✅ [AUTH] signOut.fulfilled: User signed out, all states reset');
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
  resetLinkProcess 
} = authSlice.actions;

export default authSlice.reducer; 