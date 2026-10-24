# Plan de retrait Supabase — app mobile

État au 2026-10-24 (branche `veille-medicale-cest-un-7c048d39`). L'auth passe par
Convex Auth (`lib/authConfig.ts` hardcodé `true`), mais **Supabase est encore
utilisé dans 10 fichiers**. Ce document inventorie chaque usage et la fonction
Convex de remplacement. Rien n'est encore remplacé.

## Contexte important

- **Les utilisateurs connectés via Convex Auth n'ont pas de session Supabase.**
  Toute écriture Supabase protégée par RLS (`auth.uid() = user_id`) échoue donc
  aujourd'hui pour eux (likes, lus, profil, push tokens…). Seuls les invités
  (`signInAnonymously`) ont une session Supabase. Ces usages sont donc des
  **bugs actifs**, pas seulement de la dette.
- Un autre chantier fait dériver l'identité côté Convex de Convex Auth
  (`getAuthUserId` → `userMirror` → `supabaseId`) au lieu des args
  `userId` / `supabaseId` (gardés optionnels pour compat). Les remplacements
  ci-dessous doivent appeler les fonctions **sans** passer `userId` une fois ce
  chantier livré.
- `convex/interactions.ts:getSavedArticlesFor` compare `identity.subject` au
  `supabaseId` : avec Convex Auth, `subject` vaut `convexUserId|sessionId`, la
  query renvoie donc toujours `[]`. À corriger côté backend avant de l'utiliser.

## Inventaire

Légende priorité : **P0** = cassé en prod pour les comptes Convex Auth,
**P1** = repli/legacy encore exécuté, **P2** = nettoyage.

### Auth / compte

| Fichier:ligne | Usage | Remplacement Convex | Prio |
|---|---|---|---|
| `app/profile.tsx:194` | `handleLogout` → `supabase.auth.signOut()` seulement : **ne déconnecte pas la session Convex** | `dispatch(signOut())` (`store/authSlice.ts:185`, appelle `convexSignOut`) | P0 |
| `components/LinkGuestAccountSection.tsx:205` | idem, logout Supabase seul | `dispatch(signOut())` | P0 |
| `app/(auth)/(register)/preferences.tsx:95` | Inscription via `supabase.auth.signUp` — le compte créé ne peut pas se connecter via Convex Auth (sauf migration lazy PasswordShadow) | `dispatch(signUp(...))` (`authSlice.ts:77`, Convex Auth `Password` flow `signUp` + `authMigration.linkNewSignup`) | P0 |
| `app/(auth)/(register)/preferences.tsx:140` | insert `user_profiles` (prefs notif, grade min) | nouvelle mutation `userMirror.updateMyProfile` (champs `notificationFrequency`, `minimumGradeNotification`, `firstName`, `lastName`) — **à créer** | P0 |
| `app/(auth)/(register)/preferences.tsx:154`, `components/LinkGuestAccountSection.tsx:125` | edge function `send-welcome-email` (anon key en dur) | action Convex `emails.sendWelcome` (internal, déclenchée par `linkNewSignup`) — **à créer** | P1 |
| `components/Auth.tsx:26` | `signUpWithEmail` Supabase (composant legacy, non importé) | supprimer le composant | P2 |
| `components/ForgotPasswordModal.tsx:79` | `resetPasswordForEmail` (redirect `sano://reset-password`, mauvais scheme — l'app est `veillemedicale://`) | Convex Auth `Password` avec `reset` provider (OTP email via Resend) → `signIn('password', { flow: 'reset', email })` puis `flow: 'reset-verification'` — **provider à configurer dans `convex/authProviders/PasswordShadow.ts`** | P0 |
| `store/authSlice.ts:118` | `signInAnonymously` (mode invité) | Convex Auth `Anonymous` provider (`@convex-dev/auth/providers/Anonymous`) — **à ajouter dans `convex/auth.ts`** ; ou supprimer le mode invité | P1 |
| `store/authSlice.ts:159`, `:193` | `supabase.auth.signOut()` défensif (purge sessions legacy) | supprimer après retrait du mode invité Supabase | P2 |
| `components/LinkGuestAccountSection.tsx:111` | insert `user_profiles` lors de la conversion invité → compte | `authMigration.linkNewSignup` + `userMirror.updateMyProfile` | P1 |
| `app/profile.tsx:207` | edge function `self-deletion-user` (anon key en dur, `user_id` en body = **n'importe qui peut supprimer n'importe quel compte** si l'edge ne vérifie pas le JWT) | mutation/action `account.deleteMe` (identité Convex Auth, purge `userMirror`, interactions, auth tables) — **à créer**. Requis Apple (5.1.1(v)) | P0 |

### Profil / préférences

| Fichier:ligne | Usage | Remplacement Convex | Prio |
|---|---|---|---|
| `store/profileSlice.ts:184` | update `user_profiles` | `userMirror.updateMyProfile` (**à créer**) | P0 |
| `store/profileSlice.ts:198`, `:212` | delete/insert `user_grade_preferences` | `interactions.syncUserProfileFor` (`grades`) | P0 |
| `store/profileSlice.ts:221`, `:236` | delete/insert `user_subscriptions` | `interactions.syncUserProfileFor` (`subscriptions`) — un seul appel couvre grades + subs | P0 |
| `services/NotificationService.ts:306` | lecture `user_profiles.notification_frequency` | `userMirror.getBySupabaseId` (ou `getMe` identity-based) → `notificationFrequency` | P1 |
| `services/NotificationService.ts:334` | update `notification_frequency` | `userMirror.updateMyProfile` | P0 |

### Articles / interactions

| Fichier:ligne | Usage | Remplacement Convex | Prio |
|---|---|---|---|
| `store/articlesSlice.ts:101` | repli RPC `get_user_subscription_structure_with_subs` | supprimer le repli (primaire : `articles.getUserSubscriptionStructureFor`) | P2 |
| `store/articlesSlice.ts:138` | repli `disciplines` | supprimer (primaire : `articles.getDisciplineMap` / `getDisciplines`) | P2 |
| `store/articlesSlice.ts:164` | repli `sub_disciplines` | supprimer (primaire : `articles.getSubDisciplinesById`) | P2 |
| `store/articlesSlice.ts:182` | `fetchSavedArticles` → `saved_articles` | `interactions.getSavedArticlesFor` (après fix `identity.subject`) | P0 |
| `store/articlesSlice.ts:244` | repli RPC `get_all_articles_sub_disciplines` | supprimer (primaire : `articles.getArticlesFeed`) | P2 |
| `store/articlesSlice.ts:277`, `:280` | `toggleLike` écrit Supabase **puis** mirror Convex — l'écriture Supabase échoue (RLS) et throw avant le mirror | `interactions.setLikeFor` seul | P0 |
| `store/articlesSlice.ts:309`, `:312` | `toggleRead`, même schéma | `interactions.markReadFor` | P0 |
| `store/articlesSlice.ts:344`, `:347` | `toggleThumbsUp`, même schéma | `interactions.setThumbsUpFor` | P0 |
| `store/articlesSlice.ts:372` | `fetchLikedArticles` → RPC `get_user_liked_articles` | `articles.getLikedFeed` (+ `getLikedFilters`) | P0 |
| `app/article-detail.tsx:123` | lecture `showed_articles` | `articles.getArticleDetailFor({ legacyId })` | P1 |
| `app/article-detail.tsx:141-143` | états like/read/thumbs | inclus dans `getArticleDetailFor` (via `userId`/identité) ou `interactions.getUserArticleStateFor` | P0 |

### Notifications push

| Fichier:ligne | Usage | Remplacement Convex | Prio |
|---|---|---|---|
| `services/NotificationService.ts:106` | upsert `user_push_tokens` | mutation `pushTokens.register` + table `expoPushTokens` (by_user, by_token) — **à créer** (seul `webPushSubscriptions` existe) | P0 |
| `services/NotificationService.ts:203`, `:234` | edge `send-push-notification` avec JWT Supabase (absent pour Convex Auth) | action Convex `pushTokens.send` (internal) appelant l'API Expo Push ; déclenchement par crons existants (`userFeed.buildAllFeeds`) | P1 |
| `app/profile.tsx:317` | broadcast admin : liste **tous** les `user_profiles` côté client puis boucle d'appels edge | action admin `pushTokens.broadcast` (check `userMirror.isAdmin`) | P1 |

### Arguments d'identité passés par le client (`userId` / `supabaseId`)

Le mobile passe encore l'identité de l'utilisateur courant en argument aux
fonctions Convex. Le serveur va dériver l'identité de Convex Auth (args gardés
optionnels pour compat) ; **ces arguments seront retirés côté mobile dans une
étape ultérieure**, une fois le déploiement serveur en place. Tant qu'ils
existent, un client peut usurper un autre `userId` si la fonction ne vérifie
pas l'identité.

| Fichier:ligne | Fonction | Argument à retirer |
|---|---|---|
| `app/(app)/discussions/index.tsx:69` | `discussions.list` | `userId` |
| `app/(app)/discussions/index.tsx:90` | `discussions.voteFor` | `userId` |
| `app/(app)/discussions/index.tsx:256` | `discussions.createFor` | `userId` |
| `app/(app)/discussions/[id].tsx:72` | `discussions.get` | `userId` |
| `app/(app)/discussions/[id].tsx:89` | `discussions.voteFor` | `userId` |
| `app/(app)/discussions/[id].tsx:106` | `discussions.voteCommentFor` | `userId` |
| `app/(app)/discussions/[id].tsx:123` | `discussions.addCommentFor` | `userId` |
| `app/(app)/live-chat/index.tsx:162` | `liveChat.sendMessage` | `supabaseId` |
| `app/(app)/live-chat/index.tsx:180` | `liveChat.deleteMessage` | `supabaseId` |
| `app/(app)/messages/index.tsx:58` | `social.listConversations` | `supabaseId` |
| `app/(app)/messages/[id].tsx:89` | `social.listConversations` | `supabaseId` |
| `app/(app)/messages/[id].tsx:95` | `social.listMessages` | `supabaseId` |
| `app/(app)/messages/[id].tsx:113` | `social.markRead` | `supabaseId` |
| `app/(app)/messages/[id].tsx:122` | `social.sendDirectMessage` | `supabaseId` |
| `app/(app)/u/[userId].tsx:80` | `social.getOrCreateConversation` | `supabaseId` (garder `otherUserSupabaseId`) |
| `app/search.tsx:56`, `store/articlesSlice.ts:222` | `articles.getArticlesFeed` | `userId` |
| `store/articlesSlice.ts:96` | `articles.getUserSubscriptionStructureFor` | `userId` |
| `store/articlesSlice.ts:285`, `:319`, `:352` | `interactions.setLikeFor` / `markReadFor` / `setThumbsUpFor` | `userId` |
| `store/profileSlice.ts:95` | `userMirror.getBySupabaseId` | remplacer par une query `getMe` sans arg |
| `store/profileSlice.ts:136` | `articles.getMobileProfileRelations` | `userId` |

Restent légitimes (identifiant public d'un **autre** utilisateur) :
`social.getPublicProfile({ supabaseId })` (`app/(app)/u/[userId].tsx:67`) et
`otherUserSupabaseId`. Les nouveaux remplacements listés plus haut
(`getSavedArticlesFor`, `getLikedFeed`, `syncUserProfileFor`, …) doivent être
appelés sans argument d'identité.

### Fin de chantier (P2)

- Supprimer `lib/supabase.ts` (anon key en dur), `@supabase/supabase-js` et
  `react-native-url-polyfill` si plus utilisé, l'exclusion `supabase/functions`
  dans `tsconfig.json`, `NOTIFICATIONS_SETUP.md` (doc Supabase).
- `lib/auth/convexAuthClient.ts:274-377` : garder `supabaseId` comme identifiant
  métier (`userMirror`) tant que les tables Convex indexent sur `userId = supabaseId`.

## Ordre proposé

1. P0 auth : logout (`profile.tsx`, `LinkGuestAccountSection.tsx`), inscription, reset password, suppression de compte.
2. P0 data : likes/lus/thumbs/saved/liked, profil + prefs (`syncUserProfileFor` + `updateMyProfile`).
3. Push tokens Expo dans Convex.
4. Mode invité (Anonymous provider ou suppression), puis retrait des replis et du client Supabase.

## Préparation stores

| Point | État | Action |
|---|---|---|
| Icône 1024×1024 (App Store) | `assets/icon.png` = 512×512 ; aucune source plus grande dans `med_kit/frontend/static` (max `favicon-512.png`, `logo-400.png`) | **À faire** : exporter le logo en 1024 depuis la source vectorielle (Figma). Upscaler le 512 donnerait un rendu flou. Idem `adaptive-icon.png` (Android recommande 1024 avec zone de sécurité). |
| iOS `buildNumber` | `"4"` dans `app.json` | Fait : `eas.json` production `autoIncrement: true` (`appVersionSource: local` → incrémente `app.json`, à committer après chaque build). Vérifier que 4 > dernier build TestFlight. |
| Android `versionCode` | absent | Fait : `versionCode: 4`. **Vérifier dans Play Console** que c'est > dernier versionCode publié, sinon l'augmenter. |
| Plugin `expo-notifications` | absent | Fait : `["expo-notifications", { "color": "#05403E" }]`. À faire : icône de notif Android monochrome blanche 96×96 (`icon`), et credentials FCM v1 (`google-services.json`) + APNs via EAS. |
| Privacy manifest iOS | absent | Fait : `ios.privacyManifests` avec les API « required reason » de RN/Expo (UserDefaults CA92.1, FileTimestamp C617.1, SystemBootTime 35F9.1, DiskSpace E174.1). À compléter avec `NSPrivacyCollectedDataTypes` si App Store Connect le demande. |
| `RECORD_AUDIO` (ajouté par `expo-av`) | non bloqué | Fait : `android.blockedPermissions: ["android.permission.RECORD_AUDIO"]` (l'app ne fait que de la lecture audio). À terme : migrer `expo-av` → `expo-audio`. |
| Suppression de compte in-app | edge Supabase non authentifiée | Voir P0 `account.deleteMe`. |
| Scheme reset password | `sano://` alors que `scheme` = `veillemedicale` | Voir P0 reset password. |
