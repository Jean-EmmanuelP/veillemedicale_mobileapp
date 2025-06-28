import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationFrequency {
  tous_les_jours: number;
  tous_les_2_jours: number;
  tous_les_3_jours: number;
  '1_fois_par_semaine': number;
  tous_les_15_jours: number;
  '1_fois_par_mois': number;
}

const frequencyIntervals: NotificationFrequency = {
  tous_les_jours: 1,
  tous_les_2_jours: 2,
  tous_les_3_jours: 3,
  '1_fois_par_semaine': 7,
  tous_les_15_jours: 15,
  '1_fois_par_mois': 30,
};

console.info('Function "send-scheduled-notifications" up and running!');

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Créer un client Supabase admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Récupérer tous les utilisateurs avec leurs préférences de notification
    const { data: users, error: usersError } = await supabaseAdmin
      .from('user_profiles')
      .select(`
        id,
        notification_frequency,
        user_push_tokens (
          push_token
        )
      `)
      .not('notification_frequency', 'is', null);

    if (usersError) {
      throw usersError;
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users with notification preferences found" }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const notificationsSent = [];
    const errors = [];

    // Pour chaque utilisateur, vérifier si une notification doit être envoyée
    for (const user of users) {
      try {
        const frequency = user.notification_frequency as keyof NotificationFrequency;
        const interval = frequencyIntervals[frequency];
        
        if (!interval) {
          console.warn(`Invalid frequency for user ${user.id}: ${frequency}`);
          continue;
        }

        // Vérifier si l'utilisateur a des tokens push
        if (!user.user_push_tokens || user.user_push_tokens.length === 0) {
          console.warn(`No push tokens found for user ${user.id}`);
          continue;
        }

        // Vérifier si une notification doit être envoyée aujourd'hui
        const shouldSendToday = await shouldSendNotificationToday(user.id, interval, supabaseAdmin);
        
        if (shouldSendToday) {
          // Envoyer la notification à tous les tokens de l'utilisateur
          for (const tokenData of user.user_push_tokens) {
            const notificationResult = await sendPushNotification(
              tokenData.push_token,
              user.id
            );
            
            if (notificationResult.success) {
              notificationsSent.push({
                userId: user.id,
                token: tokenData.push_token,
                frequency
              });
            } else {
              errors.push({
                userId: user.id,
                token: tokenData.push_token,
                error: notificationResult.error
              });
            }
          }

          // Marquer que la notification a été envoyée aujourd'hui
          await markNotificationSent(user.id, supabaseAdmin);
        }
      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error);
        errors.push({
          userId: user.id,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: "Scheduled notifications processed",
        notificationsSent: notificationsSent.length,
        errors: errors.length,
        details: {
          sent: notificationsSent,
          errors: errors
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in send-scheduled-notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Fonction pour vérifier si une notification doit être envoyée aujourd'hui
async function shouldSendNotificationToday(
  userId: string, 
  interval: number, 
  supabaseAdmin: any
): Promise<boolean> {
  try {
    // Récupérer la dernière notification envoyée
    const { data: lastNotification, error } = await supabaseAdmin
      .from('notification_history')
      .select('sent_at')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    if (!lastNotification) {
      // Première notification pour cet utilisateur
      return true;
    }

    const lastSentDate = new Date(lastNotification.sent_at);
    const today = new Date();
    
    // Calculer la différence en jours
    const diffTime = today.getTime() - lastSentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays >= interval;
  } catch (error) {
    console.error(`Error checking notification schedule for user ${userId}:`, error);
    return false;
  }
}

// Fonction pour envoyer une notification push
async function sendPushNotification(
  pushToken: string, 
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const message = {
      to: pushToken,
      sound: 'default',
      title: 'Veille Medicale',
      body: 'De nouveaux articles sont disponibles pour votre veille scientifique !',
      data: { 
        type: 'scheduled_veille',
        userId: userId,
        timestamp: new Date().toISOString()
      },
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorText = await response.text();
      return { success: false, error: errorText };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Fonction pour marquer qu'une notification a été envoyée
async function markNotificationSent(userId: string, supabaseAdmin: any): Promise<void> {
  try {
    await supabaseAdmin
      .from('notification_history')
      .insert({
        user_id: userId,
        sent_at: new Date().toISOString(),
        type: 'scheduled_veille'
      });
  } catch (error) {
    console.error(`Error marking notification sent for user ${userId}:`, error);
  }
} 