/**
 * Discussions — liste (parité web `/discussions`).
 * Données LIVE via Convex (api.discussions.list) — même déploiement partagé que le web.
 * Auth Supabase : les visiteurs voient une invite de connexion (parité web).
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useConvex } from 'convex/react';
import { api } from '../../../lib/convex';
import { useAppSelector } from '../../../store/hooks';
import TopHeader from '../../../components/TopHeader';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../../assets/design-system';

type Discussion = {
  id: string;
  title: string;
  content: string;
  specialty?: string | null;
  created_at: number;
  vote_count: number;
  comment_count: number;
  user_vote: number | null;
  author: { first_name: string; last_name: string; status: string | null; specialty: string | null };
};

function timeAgo(dateVal: number | string): string {
  const now = new Date();
  const date = new Date(dateVal);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DiscussionsScreen() {
  const router = useRouter();
  const convex = useConvex();
  const { user, isAnonymous } = useAppSelector((s) => s.auth);
  const profile = useAppSelector((s) => s.profile.profile);
  const loggedIn = !!user && !isAnonymous;

  const [refreshing, setRefreshing] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);

  // LIVE via Convex — wrapped try/catch pour ne pas crasher si module absent en prod.
  let rawData: unknown = undefined;
  let queryError: string | null = null;
  try {
    rawData = useQuery(
      (api as any).discussions?.list,
      {} as any
    );
  } catch (e: any) {
    queryError = e?.message || String(e);
  }
  const discussions: Discussion[] = Array.isArray(rawData) ? (rawData as Discussion[]) : [];
  const isLoading = rawData === undefined && !queryError;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Convex est déjà LIVE ; on simule le refresh pour l'UX.
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const handleVote = useCallback(
    async (discussionId: string, currentVote: number | null, newVote: number) => {
      if (!loggedIn) return;
      const target = currentVote === newVote ? 0 : newVote;
      try {
        await convex.mutation(api.discussions.voteFor as any, {
          discussionId,
          vote: target,
        });
      } catch (e) {
        console.error('[discussions] vote error', e);
      }
    },
    [convex, loggedIn, user]
  );

  const handleOpenDetail = (id: string) => {
    router.push(`/discussions/${id}`);
  };

  const renderItem = ({ item }: { item: Discussion }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => handleOpenDetail(item.id)}
      style={styles.card}
    >
      <View style={styles.voteCol}>
        <TouchableOpacity
          onPress={() => handleVote(item.id, item.user_vote, 1)}
          style={styles.voteButton}
          hitSlop={8}
        >
          <Ionicons
            name={item.user_vote === 1 ? 'chevron-up-circle' : 'chevron-up-circle-outline'}
            size={22}
            color={item.user_vote === 1 ? COLORS.primary.main : COLORS.icon.secondary}
          />
        </TouchableOpacity>
        <Text
          style={[
            styles.voteCount,
            item.vote_count > 0
              ? { color: COLORS.primary.main }
              : item.vote_count < 0
              ? { color: COLORS.error }
              : null,
          ]}
        >
          {item.vote_count}
        </Text>
        <TouchableOpacity
          onPress={() => handleVote(item.id, item.user_vote, -1)}
          style={styles.voteButton}
          hitSlop={8}
        >
          <Ionicons
            name={item.user_vote === -1 ? 'chevron-down-circle' : 'chevron-down-circle-outline'}
            size={22}
            color={item.user_vote === -1 ? COLORS.error : COLORS.icon.secondary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.metaRow}>
          <Text style={styles.metaAuthor}>
            {item.author.first_name} {item.author.last_name}
          </Text>
          {item.author.status ? (
            <Text style={styles.metaStatus}>{item.author.status}</Text>
          ) : null}
          {item.author.specialty ? (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaStatus}>{item.author.specialty}</Text>
            </>
          ) : null}
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaTime}>{timeAgo(item.created_at)}</Text>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>

        {item.specialty ? (
          <Text style={styles.specialtyTag}>{item.specialty}</Text>
        ) : null}

        <Text style={styles.cardExcerpt} numberOfLines={2}>
          {item.content}
        </Text>

        <View style={styles.cardFooter}>
          <Ionicons name="chatbubble-outline" size={14} color={COLORS.icon.secondary} />
          <Text style={styles.commentCount}>
            {item.comment_count} commentaire{item.comment_count !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TopHeader title="Communauté" />


      {!loggedIn ? (
        <View style={styles.centerContainer}>
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary.main} />
          </View>
          <Text style={styles.emptyTitle}>Réservé aux membres</Text>
          <Text style={styles.emptyText}>
            Connectez-vous pour lire les discussions et échanger avec vos confrères.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/profile')}
          >
            <Text style={styles.primaryButtonText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      ) : isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary.main} />
          <Text style={styles.loadingText}>Chargement des discussions…</Text>
        </View>
      ) : discussions.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyTitle}>Aucune discussion pour le moment</Text>
          <Text style={styles.emptyText}>Soyez le premier à lancer un sujet.</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setShowNewModal(true)}
          >
            <Text style={styles.primaryButtonText}>Nouveau sujet</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={discussions}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          estimatedItemSize={140}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {loggedIn ? (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowNewModal(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={26} color={COLORS.text.white} />
        </TouchableOpacity>
      ) : null}

      <NewDiscussionModal
        visible={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSubmit={async ({ title, content, specialty }) => {
          if (!user) return;
          try {
            await convex.mutation(api.discussions.createFor as any, {
              title: title.trim(),
              content: content.trim(),
              specialty: specialty || undefined,
            });
            setShowNewModal(false);
          } catch (e: any) {
            Alert.alert('Erreur', e?.message || 'Impossible de créer la discussion');
          }
        }}
      />
    </View>
  );
}

// ---- Modal Nouvelle discussion ----
function NewDiscussionModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; content: string; specialty: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = title.trim().length > 0 && content.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit({ title, content, specialty });
      setTitle('');
      setContent('');
      setSpecialty('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.background.primary }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <Text style={styles.modalCancel}>Annuler</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Nouvelle discussion</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={styles.modalCloseButton}
          >
            <Text
              style={[
                styles.modalPublish,
                !canSubmit && { color: COLORS.text.disabled },
              ]}
            >
              {submitting ? '…' : 'Publier'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.base }}>
          <Text style={styles.inputLabel}>Titre</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Votre sujet"
            placeholderTextColor={COLORS.text.disabled}
            maxLength={140}
          />

          <Text style={[styles.inputLabel, { marginTop: SPACING.base }]}>Spécialité (optionnel)</Text>
          <TextInput
            style={styles.input}
            value={specialty}
            onChangeText={setSpecialty}
            placeholder="Ex: Cardiologie"
            placeholderTextColor={COLORS.text.disabled}
            maxLength={80}
          />

          <Text style={[styles.inputLabel, { marginTop: SPACING.base }]}>Contenu</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={content}
            onChangeText={setContent}
            placeholder="Détaillez votre sujet, contexte clinique, question…"
            placeholderTextColor={COLORS.text.disabled}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.text.secondary,
    ...TYPOGRAPHY.body.small,
  },
  emptyTitle: {
    ...TYPOGRAPHY.heading.h3,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  emptyText: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  lockIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.primary.subtle,
    marginBottom: SPACING.base,
    borderRadius: RADIUS.md,
  },
  primaryButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  primaryButtonText: {
    ...TYPOGRAPHY.button.medium,
    color: COLORS.text.white,
  },
  listContainer: {
    paddingBottom: 120,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border.light,
    marginHorizontal: SPACING.base,
  },
  card: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.base,
    gap: SPACING.md,
    backgroundColor: COLORS.background.primary,
  },
  voteCol: {
    width: 40,
    alignItems: 'center',
    gap: 2,
    paddingTop: 2,
  },
  voteButton: {
    padding: 2,
  },
  voteCount: {
    ...TYPOGRAPHY.label.medium,
    color: COLORS.text.tertiary,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  metaAuthor: {
    ...TYPOGRAPHY.label.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  metaStatus: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  metaDot: {
    color: COLORS.text.disabled,
    fontSize: 12,
  },
  metaTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  cardTitle: {
    ...TYPOGRAPHY.heading.h3,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  specialtyTag: {
    ...TYPOGRAPHY.label.small,
    color: COLORS.primary.main,
    fontWeight: '600',
    marginBottom: 6,
  },
  cardExcerpt: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.sm,
  },
  commentCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 108 : 88,
    right: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  // Modal
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  modalCloseButton: {
    minWidth: 60,
  },
  modalCancel: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
  },
  modalTitle: {
    ...TYPOGRAPHY.heading.h4,
    color: COLORS.text.primary,
  },
  modalPublish: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.primary.main,
    fontWeight: '600',
    textAlign: 'right',
  },
  inputLabel: {
    ...TYPOGRAPHY.label.small,
    color: COLORS.text.secondary,
    textTransform: 'uppercase',
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.primary,
  },
  textarea: {
    minHeight: 160,
    paddingTop: SPACING.md,
  },
});

const hubStyles = StyleSheet.create({
  pillsBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
    paddingVertical: SPACING.sm,
  },
  pillsRow: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.primary,
  },
  pillActive: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.main,
  },
  pillText: {
    ...TYPOGRAPHY.label.small,
    color: COLORS.text.secondary,
  },
  pillTextActive: {
    ...TYPOGRAPHY.label.small,
    color: COLORS.text.white,
    fontWeight: '600',
  },
});
