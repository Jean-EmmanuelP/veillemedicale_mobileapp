/**
 * authConfig — mobile Veille Médicale.
 *
 * Historique : ce fichier exposait un feature flag `EXPO_PUBLIC_AUTH_CONVEX_ENABLED`
 * pour la migration Supabase Auth → Convex Auth (Phase 4). Un rollout canary était
 * prévu par binary EAS.
 *
 * Décision finale : l'app mobile est **100 % Convex** (auth ET data via `convex/react`).
 * Le chemin Supabase Auth legacy (`SupabaseAuthBootstrap`) est mort code.
 *
 * On hardcode `true` pour :
 *   1. Empêcher un fallback accidentel sur le legacy si l'env var manque au build.
 *   2. Éviter le bug d'auth-loop observé quand `SupabaseAuthBootstrap` se re-monte
 *      à chaque `dispatch(setUser)` (écran Paramètres qui load à l'infini,
 *      dispatch en boucle visible dans les logs Expo).
 *
 * ⚠️ NE PAS remettre le flag en variable d'env sans un vrai plan de rollback.
 */
export const AUTH_CONVEX_ENABLED: boolean = true;
