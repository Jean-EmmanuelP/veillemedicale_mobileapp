-- Création de la table notification_history
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  type TEXT NOT NULL DEFAULT 'scheduled_veille',
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON notification_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_history_type ON notification_history(type);

-- RLS (Row Level Security)
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux utilisateurs de voir leur propre historique
CREATE POLICY "Users can view their own notification history" ON notification_history
  FOR SELECT USING (auth.uid() = user_id);

-- Politique pour permettre l'insertion (utilisée par la fonction Edge)
CREATE POLICY "Service can insert notification history" ON notification_history
  FOR INSERT WITH CHECK (true);

-- Politique pour permettre la mise à jour (pour les corrections de statut)
CREATE POLICY "Service can update notification history" ON notification_history
  FOR UPDATE USING (true); 