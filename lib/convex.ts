// Client Convex de l'app (auth + données). Cf. lib/auth/convexAuthClient.ts pour l'auth.
import Constants from 'expo-constants';
import { ConvexReactClient } from 'convex/react';
import { anyApi } from 'convex/server';

const PROD_DEPLOYMENT = 'descriptive-rabbit-338';

// URL fournie par app.config.js (`extra.convexUrl`) — aucune valeur par défaut,
// pour ne jamais tomber sur PROD par accident (cf. README, section Environnements).
const extra = (Constants.expoConfig?.extra ?? {}) as { convexUrl?: string; convexSiteUrl?: string };
if (!extra.convexUrl) {
  throw new Error('extra.convexUrl absent de la config Expo (EXPO_PUBLIC_CONVEX_URL non défini).');
}
export const CONVEX_URL: string = extra.convexUrl;
export const CONVEX_SITE_URL: string =
  extra.convexSiteUrl ?? CONVEX_URL.replace('.convex.cloud', '.convex.site');

export const IS_PROD_DEPLOYMENT = CONVEX_URL.includes(PROD_DEPLOYMENT);

if (__DEV__) {
  const log = IS_PROD_DEPLOYMENT ? console.warn : console.log;
  log(
    `[convex] Déploiement : ${CONVEX_URL}` +
      (IS_PROD_DEPLOYMENT ? ' — ⚠️ PROD en développement (créez .env.local pour DEV)' : '')
  );
}

export const convex = new ConvexReactClient(CONVEX_URL, {
  unsavedChangesWarning: false,
});

// Références de fonctions non typées (l'app mobile n'a pas de convex/_generated ;
// elle appelle les fonctions du déploiement partagé). Ex: api.articles.getArticlesFeed
export const api = anyApi;
