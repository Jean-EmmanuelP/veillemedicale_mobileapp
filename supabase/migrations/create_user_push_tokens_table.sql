-- Création de la table user_push_tokens
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, push_token)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_push_token ON user_push_tokens(push_token);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_push_tokens_updated_at 
    BEFORE UPDATE ON user_push_tokens 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security)
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux utilisateurs de voir/modifier leurs propres tokens
CREATE POLICY "Users can manage their own push tokens" ON user_push_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Politique pour permettre l'insertion de nouveaux tokens
CREATE POLICY "Users can insert their own push tokens" ON user_push_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Politique pour permettre la mise à jour des tokens existants
CREATE POLICY "Users can update their own push tokens" ON user_push_tokens
  FOR UPDATE USING (auth.uid() = user_id);

-- Politique pour permettre la suppression des tokens
CREATE POLICY "Users can delete their own push tokens" ON user_push_tokens
  FOR DELETE USING (auth.uid() = user_id); 