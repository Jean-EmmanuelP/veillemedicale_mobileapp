/**
 * authConfig — mobile Veille Médicale.
 *
 * Historique : ce fichier exposait un feature flag `EXPO_PUBLIC_AUTH_CONVEX_ENABLED`
 * pour la migration Supabase Auth → Convex Auth (Phase 4). Un rollout canary était
 * prévu par binary EAS.
 *
 * Décision finale : l'auth mobile passe par Convex Auth. Le chemin Supabase Auth
 * legacy (`SupabaseAuthBootstrap`) a été retiré. ⚠️ Des usages Supabase subsistent
 * (session anonyme, inscription, reset password, articles, likes/lus, notifications,
 * edge functions) — cf. `docs/SUPABASE_REMOVAL_PLAN.md`.
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
