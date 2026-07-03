// Client Convex (lecture live) — pointe sur le déploiement prod partagé avec le web.
// L'auth reste sur Supabase ; Convex est utilisé ici pour les lectures temps réel.
import { ConvexReactClient } from 'convex/react';
import { anyApi } from 'convex/server';

// URL surchargée par EXPO_PUBLIC_CONVEX_URL si défini, sinon prod par défaut.
export const CONVEX_URL =
  process.env.EXPO_PUBLIC_CONVEX_URL || 'https://descriptive-rabbit-338.eu-west-1.convex.cloud';

export const convex = new ConvexReactClient(CONVEX_URL, {
  unsavedChangesWarning: false,
});

// Références de fonctions non typées (l'app mobile n'a pas de convex/_generated ;
// elle appelle les fonctions du déploiement partagé). Ex: api.articles.getArticlesFeed
export const api = anyApi;
