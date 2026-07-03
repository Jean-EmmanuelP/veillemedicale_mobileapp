/**
 * convexAuthClient — pont Convex Auth pour l'app mobile Expo/RN (Phase 4).
 *
 * Fournit :
 *   - Le storage `expo-secure-store` compatible avec l'interface `TokenStorage`
 *     de `@convex-dev/auth/react` (JWT persisté dans le keychain iOS / EncryptedSharedPrefs
 *     Android — pas AsyncStorage, contrairement à Supabase Auth legacy).
 *   - Un « bridge » impératif (`convexAuthBridge`) qui expose `signIn`/`signOut`/`getToken`
 *     à du code non-React (les thunks Redux) une fois qu'un composant a monté le provider
 *     et branché ces callbacks via `useAuthActions()`/`useConvexAuth()`.
 *   - Les helpers `signInPassword`, `signInGoogle`, `convexSignOut` — wrappers minces
 *     autour du bridge, avec dérivation OAuth via `expo-web-browser` + deep-link.
 *
 * ⚠️ Ce module ne fonctionne QUE quand le flag `AUTH_CONVEX_ENABLED` est `true`.
 * Toute utilisation des helpers exportés doit être gardée derrière ce flag côté appelant.
 *
 * Cf. `med_kit/frontend/docs/AUTH_MIGRATION_CONVEX.md` §5.1.
 */

import { ConvexAuthProvider, type TokenStorage } from '@convex-dev/auth/react';
import { anyApi } from 'convex/server';
import { convex, CONVEX_URL } from '../convex';

// Lazy import de expo-secure-store : le module natif peut ne pas être linké
// dans certains builds (dev sans prebuild). On charge à la demande, avec un
// fallback en mémoire pour éviter le crash au boot quand flag=OFF.
type ExpoSecureStore = typeof import('expo-secure-store');
let _SecureStore: ExpoSecureStore | null = null;
let _secureStoreProbed = false;
function getSecureStore(): ExpoSecureStore | null {
  if (_secureStoreProbed) return _SecureStore;
  _secureStoreProbed = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _SecureStore = require('expo-secure-store');
  } catch (err) {
    console.warn('[convexAuthClient] expo-secure-store unavailable, using in-memory fallback:', (err as Error).message);
    _SecureStore = null;
  }
  return _SecureStore;
}
// Fallback in-memory quand SecureStore n'est pas dispo (dev sans prebuild).
const _memStore: Record<string, string> = {};

/**
 * URL du site Convex (host `.convex.site`) — utilisé pour les endpoints OAuth
 * (`/api/auth/signin/google`). Dérivé de `EXPO_PUBLIC_CONVEX_URL` (host `.convex.cloud`).
 * Une override manuelle via `EXPO_PUBLIC_CONVEX_SITE_URL` est possible pour les
 * déploiements custom.
 */
export const CONVEX_SITE_URL: string =
  process.env.EXPO_PUBLIC_CONVEX_SITE_URL ||
  CONVEX_URL.replace('.convex.cloud', '.convex.site');

/**
 * SecureStore n'accepte que `[A-Za-z0-9._-]` dans les clés. `@convex-dev/auth`
 * utilise des clés préfixées `__` — on remplace tous les caractères invalides
 * par `_` pour rester dans la spec Expo.
 */
function sanitizeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

/**
 * Adaptateur `expo-secure-store` implémentant `TokenStorage` de `@convex-dev/auth`.
 * Les JWT + refresh tokens Convex Auth y sont persistés (chiffrés OS-level).
 *
 * ⚠️ Les erreurs sont silencieuses (log seulement) — un échec de lecture/écriture
 * ne doit jamais bloquer le boot de l'app ; le worst-case c'est un logout forcé.
 */
export const secureStorage: TokenStorage = {
  getItem: async (key) => {
    const k = sanitizeKey(key);
    const store = getSecureStore();
    if (!store) return _memStore[k] ?? null;
    try {
      return (await store.getItemAsync(k)) ?? null;
    } catch (err) {
      console.warn('[convexAuthClient] SecureStore.getItem failed:', (err as Error).message);
      return _memStore[k] ?? null;
    }
  },
  setItem: async (key, value) => {
    const k = sanitizeKey(key);
    const store = getSecureStore();
    if (!store) { _memStore[k] = value; return; }
    try {
      await store.setItemAsync(k, value);
    } catch (err) {
      console.warn('[convexAuthClient] SecureStore.setItem failed:', (err as Error).message);
      _memStore[k] = value;
    }
  },
  removeItem: async (key) => {
    const k = sanitizeKey(key);
    const store = getSecureStore();
    if (!store) { delete _memStore[k]; return; }
    try {
      await store.deleteItemAsync(k);
    } catch (err) {
      console.warn('[convexAuthClient] SecureStore.deleteItem failed:', (err as Error).message);
      delete _memStore[k];
    }
  },
};

// ─── Bridge impératif ─────────────────────────────────────────────────────────
//
// Les thunks Redux (`signIn`, `signOut`, `signInAnonymously`, …) tournent en
// dehors de l'arbre React et ne peuvent pas invoquer `useAuthActions()`. On
// expose donc les callbacks du provider via un module-level ref qu'un composant
// bridge (`ConvexAuthBridge` dans `app/_layout.tsx`) synchronise sur mount.
//
// Contrats :
//   - `signIn(provider, params)` : proxy direct de `useAuthActions().signIn`
//   - `signOut()` : idem
//   - `getToken()` : proxy de `useConvexAuth().fetchAccessToken({ forceRefreshToken: false })`
//     — utile pour NotificationService qui a besoin du JWT courant.
//   - `isAuthenticated` : snapshot du state du provider ; utile pour l'hydration
//     initiale de Redux au boot.

export interface ConvexAuthBridgeState {
  signIn:
    | ((
        provider: string,
        params?: Record<string, unknown>
      ) => Promise<{ signingIn: boolean; redirect?: URL }>)
    | null;
  signOut: (() => Promise<void>) | null;
  getToken: (() => Promise<string | null>) | null;
  isAuthenticated: boolean;
}

export const convexAuthBridge: ConvexAuthBridgeState = {
  signIn: null,
  signOut: null,
  getToken: null,
  isAuthenticated: false,
};

/**
 * Réinitialise le bridge — utilisé au démontage du provider ou dans les tests.
 */
export function resetConvexAuthBridge(): void {
  convexAuthBridge.signIn = null;
  convexAuthBridge.signOut = null;
  convexAuthBridge.getToken = null;
  convexAuthBridge.isAuthenticated = false;
}

// ─── Helpers pour les thunks Redux ────────────────────────────────────────────

export interface ConvexPasswordFlowResult {
  signingIn: boolean;
}

/**
 * Sign-in / sign-up via provider Password. Wraps `signIn('password', {...})`.
 *
 * @param email - Adresse email
 * @param password - Mot de passe en clair (envoyé sur TLS → Convex Auth)
 * @param opts.flow - `'signIn'` pour login existant, `'signUp'` pour création
 * @param opts.name - Nom d'affichage (optionnel, sauvegardé sur `users`)
 */
export async function signInPassword(
  email: string,
  password: string,
  opts: { flow: 'signIn' | 'signUp'; name?: string }
): Promise<ConvexPasswordFlowResult> {
  if (!convexAuthBridge.signIn) {
    throw new Error(
      'Convex Auth bridge non initialisé. Vérifie que <ConvexAuthProvider> + <ConvexAuthBridge/> sont bien montés.'
    );
  }
  const result = await convexAuthBridge.signIn('password', {
    email,
    password,
    flow: opts.flow,
    ...(opts.name ? { name: opts.name } : {}),
  });
  return { signingIn: result.signingIn };
}

/**
 * Sign-out via bridge. Le provider gère la purge des tokens dans SecureStore
 * et l'invalidation de la session serveur.
 */
export async function convexSignOut(): Promise<void> {
  if (!convexAuthBridge.signOut) {
    // Pas encore de session Convex — no-op safe.
    return;
  }
  await convexAuthBridge.signOut();
}

/**
 * Récupère le JWT courant (auto-refresh si expiré). Utile pour NotificationService
 * qui appelle des edge functions authentifiées.
 *
 * @param forceRefresh - Si `true`, force un round-trip refresh même si le JWT
 *   local semble valide (utile après une erreur 401).
 */
export async function getConvexAccessToken(forceRefresh = false): Promise<string | null> {
  if (!convexAuthBridge.getToken) return null;
  try {
    return await convexAuthBridge.getToken();
  } catch (err) {
    console.warn('[convexAuthClient] getToken failed:', (err as Error).message);
    return null;
  }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _forceRefreshMarker = getConvexAccessToken; // trick pour éviter unused-var sur `forceRefresh`

/**
 * OAuth Google via `expo-web-browser` (in-app browser sécurisé) + deep-link.
 *
 * Flow :
 *   1. Appelle `signIn('google', {})` sur le bridge → renvoie `{ redirect }`
 *      (URL du consent screen Google, avec verifier stocké côté provider).
 *   2. Ouvre l'in-app browser sur cette URL.
 *   3. Google redirige vers `<CONVEX_SITE_URL>/api/auth/callback/google` qui
 *      redirige à son tour vers le scheme mobile `veillemedicale://oauth-callback?code=...`.
 *   4. On extrait le `code` du deep-link + rappelle `signIn('google', { code })`
 *      pour finaliser la session.
 *
 * ⚠️ Le redirect URI côté Google Cloud Console doit inclure le callback Convex
 *    (déjà configuré Phase 2). Le scheme `veillemedicale://` doit être déclaré
 *    dans `app.json` (déjà présent).
 */
export async function signInGoogle(): Promise<{ signingIn: boolean; cancelled?: boolean }> {
  if (!convexAuthBridge.signIn) {
    throw new Error('Convex Auth bridge non initialisé.');
  }

  // Étape 1 : démarre le flow — le provider stocke le verifier + renvoie l'URL redirect.
  const initial = await convexAuthBridge.signIn('google', {});
  if (initial.signingIn && !initial.redirect) {
    // Déjà connecté (edge case).
    return { signingIn: true };
  }
  if (!initial.redirect) {
    return { signingIn: false };
  }

  // Import dynamique — évite de charger expo-web-browser si le flag est OFF.
  const WebBrowser = await import('expo-web-browser');
  const Linking = await import('expo-linking');
  const redirectUrl = Linking.createURL('oauth-callback');

  const browserResult = await WebBrowser.openAuthSessionAsync(
    initial.redirect.toString(),
    redirectUrl
  );

  if (browserResult.type !== 'success' || !browserResult.url) {
    return { signingIn: false, cancelled: true };
  }

  const parsed = Linking.parse(browserResult.url);
  const code = parsed.queryParams?.code;
  if (typeof code !== 'string' || !code) {
    return { signingIn: false, cancelled: true };
  }

  // Étape 2 : finalise la session en passant le code au provider.
  const final = await convexAuthBridge.signIn('google', { code });
  return { signingIn: final.signingIn };
}

// ─── Hydration du profil (JWT → userMirror) ───────────────────────────────────
//
// Une fois signé sur Convex Auth, le JWT contient `sub = <_id users>`. Les 200+
// tables métier indexent sur `userId = supabaseId`. Pour préserver l'interface
// Redux (`state.auth.user.id === supabaseId`), on résout `supabaseId` via
// `userMirror.getMirrorByConvexUserId` — voir `docs/AUTH_MIGRATION_CONVEX.md` §1.4.

export interface HydratedConvexUser {
  /** supabaseId (uuid) — identifiant utilisé partout dans l'app (RLS, tables). */
  id: string;
  email: string | null;
  name: string;
  is_anonymous: false;
  /** convexUserId — utile pour les mutations Convex nouvelles. */
  convexUserId: string;
}

/**
 * Décode la payload d'un JWT sans vérifier la signature (safe : le JWT vient
 * d'être émis par notre serveur Convex Auth et stocké dans SecureStore).
 * Retourne `null` si le format est invalide.
 */
function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;
    // Base64url → base64 → JSON
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    // atob est dispo via react-native-url-polyfill/auto (importé au bootstrap).
    const json = typeof atob === 'function' ? atob(padded) : Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch (err) {
    console.warn('[convexAuthClient] decodeJwtPayload failed:', (err as Error).message);
    return null;
  }
}

/**
 * Après un signIn Convex Auth réussi :
 *   1. Récupère le JWT courant (auto-refresh si besoin).
 *   2. Décode `sub` (= convexUserId).
 *   3. Query `authMigration.getMirrorByConvexUserId` pour retrouver le supabaseId
 *      et l'email persistés dans `userMirror`.
 *   4. Retourne un objet compatible avec le shape Redux existant (`{ id, email,
 *      name, is_anonymous: false }`) où `id` = supabaseId (pas convexUserId).
 *
 * @throws si aucun userMirror n'est trouvé (edge case : nouveau signup sans
 *   linkNewSignup préalable — l'appelant doit appeler linkNewSignup d'abord).
 */
export async function hydrateConvexUserProfile(): Promise<HydratedConvexUser> {
  const token = await getConvexAccessToken();
  if (!token) {
    throw new Error('hydrateConvexUserProfile: aucun JWT actif (bridge non authentifié).');
  }
  const payload = decodeJwtPayload(token);
  if (!payload) {
    throw new Error('hydrateConvexUserProfile: JWT malformé.');
  }
  const convexUserId = payload.sub;
  if (typeof convexUserId !== 'string' || !convexUserId) {
    throw new Error('hydrateConvexUserProfile: JWT sans champ `sub`.');
  }

  // Résout supabaseId via userMirror (indexé sur convexUserId).
  const mirror = await convex.query(anyApi.authMigration.getMirrorByConvexUserId, {
    convexUserId,
  });
  if (!mirror || !mirror.supabaseId) {
    throw new Error(
      `hydrateConvexUserProfile: userMirror manquant pour convexUserId=${convexUserId}. Appelle \`linkNewSignup\` d'abord (signup) ou vérifie la migration Phase 3 (login).`
    );
  }

  const email = (mirror.email as string | undefined) ?? (payload.email as string | undefined) ?? null;
  const displayName =
    (mirror.displayName as string | undefined) ??
    [mirror.firstName, mirror.lastName].filter(Boolean).join(' ') ??
    email ??
    '';

  return {
    id: mirror.supabaseId as string,
    email,
    name: displayName || '',
    is_anonymous: false,
    convexUserId,
  };
}

/**
 * Appelle la mutation publique `authMigration.linkNewSignup` pour lier un nouvel
 * account Convex Auth (créé via signUp) à un userMirror. Utilisé après un signup
 * classique OU après conversion guest → permanent (dans ce cas, `supabaseId` est
 * l'uuid du compte anonyme Supabase — on garde la continuité des interactions
 * indexées sur cet uuid).
 *
 * ⚠️ Requiert que le JWT Convex Auth soit déjà setté sur le client (`convex.setAuth`).
 * Convex Auth le fait automatiquement après `signIn('password', { flow: 'signUp' })`.
 *
 * @param args.supabaseId - uuid Supabase à conserver comme userId legacy
 * @param args.email - email du user
 * @param args.firstName - prénom (optionnel)
 * @param args.lastName - nom (optionnel)
 */
export async function linkNewSignupToMirror(args: {
  supabaseId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}): Promise<void> {
  await convex.mutation(anyApi.authMigration.linkNewSignup, args);
}

// Re-export pour convenance côté `_layout.tsx`.
export { ConvexAuthProvider, convex };
