# veillemedicale_mobileapp

App mobile Veille Médicale (Expo SDK 53, expo-router, Redux). Backend : Convex
(auth Convex Auth + données), partagé avec le web.

## Installation

```bash
bun install
```

## Environnements (Convex)

L'URL Convex est lue **uniquement** depuis la config Expo (`app.config.js` →
`extra.convexUrl`, utilisée par `lib/convex.ts`). Il n'y a aucune valeur par
défaut dans le code : si `EXPO_PUBLIC_CONVEX_URL` manque, la config échoue.

Ordre de résolution (le premier défini gagne) :

1. variable d'environnement du shell ou du profil EAS ;
2. `.env.local` — **non commité**, pour le développement ;
3. `.env` — commité, pointe sur **PROD** (`descriptive-rabbit-338`).

Pour développer sur le déploiement **DEV**, créez `.env.local` :

```bash
echo 'EXPO_PUBLIC_CONVEX_URL=https://necessary-fish-571.eu-west-1.convex.cloud' > .env.local
```

`EXPO_PUBLIC_CONVEX_SITE_URL` (host `.convex.site`, OAuth) est dérivé
automatiquement de l'URL ; ne le définir que pour un domaine personnalisé.

Vérifications :

- `npx expo config --type public | grep convex` affiche l'URL résolue ;
- au démarrage en dev, la console affiche `[convex] Déploiement : …` (en
  `warn` si c'est PROD).

Après avoir modifié `.env*`, redémarrez Metro (`--clear`) : la config est lue
au lancement.

## Lancer l'app (dev client)

```bash
npx expo run:ios --device "<simulateur>"   # build natif + installation
npx expo start --dev-client                # Metro seul, si le build est déjà installé
```

Si `pod install` échoue avec la CocoaPods de rvm, utilisez celle de Homebrew
sans les variables GEM_* :
`env -u GEM_HOME -u GEM_PATH /opt/homebrew/bin/pod install` (dans `ios/`).

## Vérifications

```bash
npx tsc --noEmit
npx expo-doctor
npx expo export --platform ios
```
