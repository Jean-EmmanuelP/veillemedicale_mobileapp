/**
 * Profil public d'un médecin (LIVE via api.social.getPublicProfile).
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useConvex } from 'convex/react';
import { api } from '../../../lib/convex';
import { useAppSelector } from '../../../store/hooks';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../../assets/design-system';

type Profile = {
  supabaseId: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  status: string | null;
  specialty: string | null;
  avatarUrl: string | null;
  linkedinUrl: string | null;
  verificationStatus: string | null;
  isAdmin: boolean;
};

// N'ouvre que des URLs https://linkedin.com ou https://*.linkedin.com
// (le champ est saisi par l'utilisateur — évite d'ouvrir un schéma/hôte arbitraire).
function safeLinkedinUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:') return null;
    if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const convex = useConvex();
  const { user, isAnonymous } = useAppSelector((s) => s.auth);
  const loggedIn = !!user && !isAnonymous;
  const isSelf = user?.id === userId;

  const [starting, setStarting] = useState(false);

  // Convex query défensive : `social.getPublicProfile` peut être absent en prod
  // → wrap try/catch pour éviter un Render Error qui blanche la page.
  let raw: unknown = undefined;
  let queryError: string | null = null;
  try {
    raw = useQuery((api as any).social?.getPublicProfile, userId ? ({ supabaseId: userId } as any) : ('skip' as any));
  } catch (e: any) {
    queryError = e?.message || String(e);
  }
  const profile: Profile | null = (raw as Profile | null) ?? null;
  const linkedinUrl = safeLinkedinUrl(profile?.linkedinUrl ?? null);
  const isLoading = raw === undefined && !queryError;

  const startConversation = async () => {
    if (!profile || starting || isSelf || !loggedIn) return;
    setStarting(true);
    try {
      const id = await convex.mutation(api.social.getOrCreateConversation as any, {
        otherUserSupabaseId: profile.supabaseId,
      } as any);
      router.push(`/messages/${id}` as any);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil</Text>
        <View style={{ width: 32 }} />
      </View>

      {queryError ? (
        <View style={styles.emptyBlock}>
          <Text style={styles.emptyText}>Profil bientôt disponible.</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.emptyBlock}>
          <ActivityIndicator />
        </View>
      ) : !profile ? (
        <View style={styles.emptyBlock}>
          <Text style={styles.emptyText}>Profil introuvable.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: SPACING.md }}>
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile.displayName.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{profile.displayName}</Text>
              {profile.verificationStatus === 'verified' && (
                <View style={styles.verifiedPill}>
                  <Ionicons name="checkmark-circle" size={12} color="#1D4ED8" />
                  <Text style={styles.verifiedText}>Vérifié</Text>
                </View>
              )}
            </View>
            <View style={styles.metaRow}>
              {profile.status && (
                <View style={styles.statusPill}>
                  <Text style={styles.statusText}>{profile.status}</Text>
                </View>
              )}
              {profile.specialty && (
                <Text style={styles.specialty}>{profile.specialty}</Text>
              )}
            </View>
            {linkedinUrl && (
              <TouchableOpacity
                onPress={() => Linking.openURL(linkedinUrl)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}
              >
                <Text style={styles.link}>LinkedIn</Text>
                <Ionicons name="open-outline" size={14} color={COLORS.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>

          {!isSelf && loggedIn && (
            <TouchableOpacity
              onPress={startConversation}
              style={styles.primaryBtn}
              disabled={starting}
            >
              <Ionicons name="chatbubble-ellipses" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>Envoyer un message</Text>
            </TouchableOpacity>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Publications</Text>
            <Text style={styles.sectionText}>
              Les articles écrits ou commentés par {profile.displayName} apparaîtront ici prochainement.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background.primary },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  backBtn: { padding: 4 },
  headerTitle: { ...TYPOGRAPHY.body.medium, fontWeight: '700', color: COLORS.text.primary },
  emptyBlock: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  emptyText: { ...TYPOGRAPHY.body.medium, color: COLORS.text.secondary },
  card: {
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary.main + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { ...TYPOGRAPHY.heading.h3, color: COLORS.primary.main, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { ...TYPOGRAPHY.heading.h3, color: COLORS.text.primary },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  verifiedText: { fontSize: 10, fontWeight: '700', color: '#1D4ED8' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  statusPill: {
    backgroundColor: COLORS.primary.main + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: { fontSize: 10, fontWeight: '700', color: COLORS.primary.main, textTransform: 'uppercase' },
  specialty: { ...TYPOGRAPHY.body.medium, color: COLORS.text.secondary },
  link: { ...TYPOGRAPHY.body.small, color: COLORS.text.tertiary, textDecorationLine: 'underline' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary.main,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  primaryBtnText: { ...TYPOGRAPHY.body.medium, fontWeight: '700', color: '#fff' },
  section: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
  },
  sectionTitle: { ...TYPOGRAPHY.body.medium, fontWeight: '700', color: COLORS.text.primary },
  sectionText: { ...TYPOGRAPHY.body.small, color: COLORS.text.tertiary, marginTop: 6 },
});
