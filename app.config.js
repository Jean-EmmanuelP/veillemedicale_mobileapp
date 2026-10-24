/**
 * app.config.js — configuration dynamique Expo (surcharge `app.json`).
 *
 * Source unique de l'URL Convex de l'app : `extra.convexUrl` / `extra.convexSiteUrl`,
 * lus au runtime par `lib/convex.ts` via `expo-constants`.
 *
 * Résolution (priorité décroissante, cf. README) :
 *   1. variable d'environnement du shell / du profil EAS ;
 *   2. `.env.local` (non commité) — à utiliser pour pointer sur DEV en local ;
 *   3. `.env` (commité) — déploiement PROD.
 * Pas de valeur par défaut codée en dur : si `EXPO_PUBLIC_CONVEX_URL` est absente,
 * la config échoue plutôt que de pointer silencieusement quelque part.
 */

const appJson = require('./app.json');

// Certaines commandes (ex. `expo export`) lisent la config avant d'avoir chargé
// les fichiers .env : on les charge ici (sans écraser les variables déjà définies).
require('@expo/env').load(__dirname, { silent: true });

module.exports = ({ config }) => {
  const merged = { ...appJson.expo, ...config };

  const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error(
      'EXPO_PUBLIC_CONVEX_URL manquant : définissez-le dans .env (PROD) ou .env.local (DEV).'
    );
  }
  const convexSiteUrl =
    process.env.EXPO_PUBLIC_CONVEX_SITE_URL || convexUrl.replace('.convex.cloud', '.convex.site');

  return {
    ...merged,
    extra: {
      ...(merged.extra || {}),
      convexUrl,
      convexSiteUrl,
    },
  };
};
