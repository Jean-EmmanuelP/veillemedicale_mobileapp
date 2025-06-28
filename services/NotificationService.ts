import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Types pour les fréquences de notification
export type NotificationFrequency = 
  | 'tous_les_jours'
  | 'tous_les_2_jours'
  | 'tous_les_3_jours'
  | '1_fois_par_semaine'
  | 'tous_les_15_jours'
  | '1_fois_par_mois';

interface NotificationPreferences {
  userId: string;
  frequency: NotificationFrequency;
  time: string; // Format "HH:mm" (ex: "12:30")
  enabled: boolean;
}

class NotificationService {
  private static instance: NotificationService;
  private pushToken: string | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Gestion des erreurs d'enregistrement
  private handleRegistrationError(errorMessage: string) {
    console.error('Notification registration error:', errorMessage);
    throw new Error(errorMessage);
  }

  // Enregistrement pour les notifications push
  async registerForPushNotificationsAsync(): Promise<string | null> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        this.handleRegistrationError('Permission not granted to get push token for push notification!');
        return null;
      }

      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      if (!projectId) {
        this.handleRegistrationError('Project ID not found');
        return null;
      }

      try {
        const pushTokenString = (
          await Notifications.getExpoPushTokenAsync({
            projectId,
          })
        ).data;
        
        this.pushToken = pushTokenString;
        console.log('Push token obtained:', pushTokenString);
        return pushTokenString;
      } catch (e: unknown) {
        this.handleRegistrationError(`${e}`);
        return null;
      }
    } else {
      this.handleRegistrationError('Must use physical device for push notifications');
      return null;
    }
  }

  // Sauvegarder le token dans Supabase
  async savePushToken(userId: string, token: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_profile_id: userId,
          push_token: token,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error saving push token:', error);
        throw error;
      }

      console.log('Push token saved successfully');
    } catch (error) {
      console.error('Failed to save push token:', error);
      throw error;
    }
  }

  // Programmer les notifications selon la fréquence
  async scheduleNotifications(preferences: NotificationPreferences): Promise<void> {
    if (!preferences.enabled) {
      await this.cancelAllNotifications();
      return;
    }

    // Annuler les notifications existantes
    await this.cancelAllNotifications();

    // Parser l'heure (format "HH:mm")
    const [hours, minutes] = preferences.time.split(':').map(Number);
    const notificationTime = new Date();
    notificationTime.setHours(hours, minutes, 0, 0);

    // Si l'heure est déjà passée aujourd'hui, programmer pour demain
    if (notificationTime <= new Date()) {
      notificationTime.setDate(notificationTime.getDate() + 1);
    }

    // Calculer l'intervalle selon la fréquence
    const interval = this.getIntervalFromFrequency(preferences.frequency);

    // Programmer la notification récurrente
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Veille Medicale',
        body: 'De nouveaux articles sont disponibles pour votre veille scientifique !',
        data: { 
          type: 'veille_reminder',
          userId: preferences.userId 
        },
      },
      trigger: {
        hour: hours,
        minute: minutes,
        repeats: true,
        seconds: 0,
      },
    });

    console.log(`Notifications scheduled for ${preferences.time} with frequency: ${preferences.frequency}`);
  }

  // Obtenir l'intervalle en jours selon la fréquence
  private getIntervalFromFrequency(frequency: NotificationFrequency): number {
    switch (frequency) {
      case 'tous_les_jours':
        return 1;
      case 'tous_les_2_jours':
        return 2;
      case 'tous_les_3_jours':
        return 3;
      case '1_fois_par_semaine':
        return 7;
      case 'tous_les_15_jours':
        return 15;
      case '1_fois_par_mois':
        return 30;
      default:
        return 1;
    }
  }

  // Annuler toutes les notifications programmées
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('All scheduled notifications cancelled');
  }

  // Obtenir les notifications programmées
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  // Envoie une notification via l'Edge Function Supabase
  async sendNotificationViaEdge(userId: string, title: string, body: string, data: any = {}) {
    try {
      const response = await fetch('https://etxelhjnqbrgwuitltyk.supabase.co/functions/v1/send-push-notification', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await this.getValidAccessToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          title,
          body,
          data,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Edge Function error: ${errorText}`);
      }

      const result = await response.json();
      console.log('Notification sent via Edge Function:', result);
      return result;
    } catch (error) {
      console.error('Error sending notification via Edge Function:', error);
      throw error;
    }
  }

  // Helper pour récupérer le token JWT courant (utilisateur connecté)
  private async getValidAccessToken(): Promise<string> {
    // Si tu utilises supabase-js v2 :
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token || '';
  }

  // Envoyer une notification de test
  async sendTestNotification(userId: string): Promise<void> {
    try {
      await this.sendNotificationViaEdge(
        userId,
        'Test Veille Medicale',
        'Ceci est une notification de test pour votre veille scientifique.',
        { type: 'test' }
      );
      console.log('Test notification sent via Edge Function');
    } catch (error) {
      console.error('Error sending test notification via Edge Function:', error);
    }
  }

  // Initialiser le service de notifications
  async initialize(userId: string): Promise<void> {
    try {
      // Enregistrer pour les notifications push
      const token = await this.registerForPushNotificationsAsync();
      
      if (token) {
        // Sauvegarder le token dans Supabase
        await this.savePushToken(userId, token);
        
        // Récupérer les préférences de l'utilisateur
        const preferences = await this.getUserNotificationPreferences(userId);
        
        if (preferences) {
          // Programmer les notifications selon les préférences
          await this.scheduleNotifications(preferences);
        }
      }
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  // Récupérer les préférences de notification de l'utilisateur
  private async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('notification_frequency')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user preferences:', error);
        return null;
      }

      // Par défaut, programmer à 12:30
      return {
        userId,
        frequency: data.notification_frequency || 'tous_les_jours',
        time: '12:30',
        enabled: true,
      };
    } catch (error) {
      console.error('Failed to get user notification preferences:', error);
      return null;
    }
  }

  // Mettre à jour les préférences de notification
  async updateNotificationPreferences(userId: string, frequency: NotificationFrequency, time: string = '12:30'): Promise<void> {
    try {
      // Mettre à jour dans Supabase
      const { error } = await supabase
        .from('user_profiles')
        .update({ notification_frequency: frequency })
        .eq('id', userId);

      if (error) {
        console.error('Error updating notification preferences:', error);
        throw error;
      }

      // Reprogrammer les notifications
      await this.scheduleNotifications({
        userId,
        frequency,
        time,
        enabled: true,
      });

      console.log('Notification preferences updated successfully');
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      throw error;
    }
  }

  // Obtenir le token push actuel
  getPushToken(): string | null {
    return this.pushToken;
  }
}

export default NotificationService; 