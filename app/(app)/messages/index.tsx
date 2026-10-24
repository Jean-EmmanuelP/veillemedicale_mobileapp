/**
 * Messages — liste des DMs (parité web `/messages`).
 * LIVE via Convex `api.social.listConversations`.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '../../../lib/convex';
import { useAppSelector } from '../../../store/hooks';
import TopHeader from '../../../components/TopHeader';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../../assets/design-system';

type Conversation = {
  id: string;
  otherUser: {
    supabaseId: string;
    displayName: string;
    status: string | null;
    specialty: string | null;
    avatarUrl: string | null;
    verificationStatus: string | null;
  };
  lastMessagePreview: string | null;
  lastMessageAt: number;
  createdAt: number;
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function MessagesScreen({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  const router = useRouter();
  const { user, isAnonymous } = useAppSelector((s) => s.auth);
  const loggedIn = !!user && !isAnonymous;

  // Guard against Convex prod not yet having `social.listConversations` deployed.
  let raw: unknown = undefined;
  let queryError: string | null = null;
  try {
    raw = useQuery(
      (api as any).social?.listConversations,
      loggedIn && (api as any).social?.listConversations
        ? ({ supabaseId: user!.id } as any)
        : ('skip' as any)
    );
  } catch (e) {
    queryError = e instanceof Error ? e.message : String(e);
  }
  const convs: Conversation[] = Array.isArray(raw) ? raw as Conversation[] : [];
  const isLoading = raw === undefined && loggedIn && !queryError;

  if (!loggedIn) {
    return (
      <View style={styles.container}>
        {!hideHeader && <TopHeader title="Messages" />}
        <View style={styles.emptyBlock}>
          <Text style={styles.emptyText}>Connectez-vous pour accéder aux messages.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!hideHeader && <TopHeader title="Messages" />}

      <View style={styles.headerRow}>
        <Text style={styles.subtitle}>Vos conversations privées</Text>
      </View>

      {queryError ? (
        <View style={styles.emptyBlock}>
          <Ionicons name="cloud-offline-outline" size={40} color={COLORS.icon.secondary} />
          <Text style={styles.emptyText}>Messagerie bientôt disponible.</Text>
          <Text style={[styles.emptyText, { fontSize: 11, opacity: 0.6 }]}>La fonctionnalité est en cours de déploiement.</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.emptyBlock}>
          <ActivityIndicator />
        </View>
      ) : convs.length === 0 ? (
        <View style={styles.emptyBlock}>
          <Ionicons name="chatbubble-ellipses-outline" size={40} color={COLORS.icon.secondary} />
          <Text style={styles.emptyText}>Aucune conversation.</Text>
        </View>
      ) : (
        <FlatList
          data={convs}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push(`/messages/${item.id}` as any)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.otherUser.displayName.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.otherUser.displayName}
                  </Text>
                  {item.otherUser.verificationStatus === 'verified' && (
                    <Ionicons name="checkmark-circle" size={14} color="#3B82F6" />
                  )}
                </View>
                {item.otherUser.specialty ? (
                  <Text style={styles.specialty} numberOfLines={1}>
                    {item.otherUser.specialty}
                  </Text>
                ) : null}
                {item.lastMessagePreview ? (
                  <Text style={styles.preview} numberOfLines={1}>
                    {item.lastMessagePreview}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.time}>{formatTime(item.lastMessageAt)}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background.primary },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  subtitle: { ...TYPOGRAPHY.body.small, color: COLORS.text.secondary },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.primary.main,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  newBtnText: { ...TYPOGRAPHY.body.small, color: COLORS.primary.main, fontWeight: '600' },
  emptyBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: 8,
  },
  emptyText: { ...TYPOGRAPHY.body.medium, color: COLORS.text.secondary, textAlign: 'center' },
  emptyLink: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.primary.main,
    fontWeight: '600',
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary.main + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...TYPOGRAPHY.body.small, fontWeight: '700', color: COLORS.primary.main },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { ...TYPOGRAPHY.body.medium, fontWeight: '600', color: COLORS.text.primary, flexShrink: 1 },
  specialty: { ...TYPOGRAPHY.body.small, color: COLORS.text.secondary, marginTop: 2 },
  preview: { ...TYPOGRAPHY.body.small, color: COLORS.text.tertiary, marginTop: 2 },
  time: { ...TYPOGRAPHY.body.small, color: COLORS.text.tertiary },
});
