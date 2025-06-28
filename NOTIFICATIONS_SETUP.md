# Configuration du Système de Notifications

## Vue d'ensemble

Le système de notifications de Veille Medicale permet d'envoyer des notifications push programmées selon les préférences de chaque utilisateur. Les notifications sont envoyées à 12:30 par défaut selon la fréquence choisie par l'utilisateur.

## Fonctionnalités

### Fréquences disponibles
- **Tous les jours** : Notification quotidienne
- **Tous les 2 jours** : Notification tous les 2 jours
- **Tous les 3 jours** : Notification tous les 3 jours
- **1 fois par semaine** : Notification hebdomadaire
- **Tous les 15 jours** : Notification bi-mensuelle
- **1 fois par mois** : Notification mensuelle

### Heure de notification
- **Heure par défaut** : 12:30 (midi et demi)
- **Configurable** : Peut être modifiée dans le code

## Configuration requise

### 1. Dépendances installées
```bash
npx expo install expo-notifications expo-device expo-constants
```

### 2. Tables Supabase
Exécuter les migrations SQL suivantes dans votre projet Supabase :

#### Table `user_push_tokens`
```sql
-- Voir le fichier : supabase/migrations/create_user_push_tokens_table.sql
```

#### Table `notification_history`
```sql
-- Voir le fichier : supabase/migrations/create_notification_history_table.sql
```

### 3. Fonction Edge Supabase
Déployer la fonction Edge `send-scheduled-notifications` :
```bash
# Dans le dossier supabase/functions/send-scheduled-notifications
supabase functions deploy send-scheduled-notifications
```

### 4. Configuration EAS
Assurez-vous que votre `app.json` contient le projectId :
```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "votre-project-id"
      }
    }
  }
}
```

## Architecture

### Composants principaux

1. **NotificationService** (`services/NotificationService.ts`)
   - Gère l'enregistrement des tokens push
   - Programmation des notifications locales
   - Sauvegarde des préférences

2. **Fonction Edge** (`supabase/functions/send-scheduled-notifications/`)
   - Envoie les notifications programmées
   - Vérifie les préférences utilisateur
   - Gère l'historique des notifications

3. **Intégration UI** (`app/(app)/profile.tsx`)
   - Bouton de test des notifications
   - Mise à jour des préférences

### Flux de données

1. **Inscription utilisateur** → Token push généré → Sauvegardé dans Supabase
2. **Modification préférences** → NotificationService mis à jour → Reprogrammation
3. **Cron job** → Fonction Edge appelée → Vérification des utilisateurs éligibles
4. **Envoi notification** → Expo Push Service → Appareil utilisateur

## Configuration du Cron Job

Pour que les notifications programmées fonctionnent, vous devez configurer un cron job qui appelle la fonction Edge quotidiennement.

### Option 1 : Supabase Cron (recommandé)
```sql
-- Créer un cron job dans Supabase
SELECT cron.schedule(
  'send-scheduled-notifications',
  '0 12 * * *', -- Tous les jours à 12:00
  'SELECT net.http_post(
    url := ''https://etxelhjnqbrgwuitltyk.supabase.co/functions/v1/send-scheduled-notifications'',
    headers := ''{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}''::jsonb
  );'
);
```

### Option 2 : Service externe (Vercel Cron, etc.)
```javascript
// Exemple avec Vercel Cron
export default async function handler(req, res) {
  const response = await fetch(
    'https://etxelhjnqbrgwuitltyk.supabase.co/functions/v1/send-scheduled-notifications',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );
  
  res.status(200).json({ success: true });
}
```

## Test des notifications

### 1. Test manuel
- Utiliser le bouton "Tester les notifications" dans le profil utilisateur
- Vérifier que la notification apparaît sur l'appareil

### 2. Test de la fonction Edge
```bash
curl -X POST https://etxelhjnqbrgwuitltyk.supabase.co/functions/v1/send-scheduled-notifications \
  -H "Authorization: Bearer votre-service-role-key"
```

### 3. Vérification des logs
- Consulter les logs de la fonction Edge dans Supabase Dashboard
- Vérifier la table `notification_history` pour les envois

## Dépannage

### Problèmes courants

1. **Notifications ne s'affichent pas**
   - Vérifier les permissions sur l'appareil
   - S'assurer que l'app est en arrière-plan
   - Vérifier que le token push est valide

2. **Fonction Edge ne répond pas**
   - Vérifier les variables d'environnement
   - Consulter les logs dans Supabase Dashboard
   - S'assurer que les tables existent

3. **Notifications programmées ne s'envoient pas**
   - Vérifier que le cron job est configuré
   - Consulter l'historique des notifications
   - Vérifier les préférences utilisateur

### Logs utiles
```javascript
// Dans NotificationService.ts
console.log('Push token obtained:', pushTokenString);
console.log('Notifications scheduled for', preferences.time, 'with frequency:', preferences.frequency);

// Dans la fonction Edge
console.log('Scheduled notifications processed', notificationsSent.length, 'sent');
```

## Personnalisation

### Modifier l'heure par défaut
Dans `NotificationService.ts`, ligne ~200 :
```typescript
time: '12:30', // Modifier cette valeur
```

### Modifier le message de notification
Dans `NotificationService.ts`, ligne ~150 :
```typescript
title: 'Veille Medicale',
body: 'De nouveaux articles sont disponibles pour votre veille scientifique !',
```

### Ajouter de nouvelles fréquences
1. Modifier le type `NotificationFrequency`
2. Ajouter la logique dans `getIntervalFromFrequency`
3. Mettre à jour l'interface utilisateur

## Sécurité

- Les tokens push sont stockés de manière sécurisée dans Supabase
- RLS (Row Level Security) activé sur toutes les tables
- Les utilisateurs ne peuvent accéder qu'à leurs propres données
- La fonction Edge utilise la clé service role pour les opérations admin 