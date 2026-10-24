/**
 * app.config.js — configuration dynamique Expo (surcharge `app.json`).
 *
 * Expose les URLs Convex dans `expo.extra.*` (lecture runtime via
 * `expo-constants`). Les variables `EXPO_PUBLIC_*` restent aussi accessibles
 * via `process.env`.
 *
 * L'auth mobile passe par Convex Auth (hardcodé dans `lib/authConfig.ts`,
 * plus de feature flag).
 */

const appJson = require('./app.json');

module.exports = ({ config }) => {
  const merged = { ...appJson.expo, ...config };

  return {
    ...merged,
    extra: {
      ...(merged.extra || {}),
      EXPO_PUBLIC_CONVEX_URL: process.env.EXPO_PUBLIC_CONVEX_URL,
      EXPO_PUBLIC_CONVEX_SITE_URL: process.env.EXPO_PUBLIC_CONVEX_SITE_URL,
    },
  };
};
