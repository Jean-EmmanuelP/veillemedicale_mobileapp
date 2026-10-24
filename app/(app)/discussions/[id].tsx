/**
 * Discussions — détail + commentaires + votes (parité web `/discussions/[id]`).
 * Données LIVE via Convex (api.discussions.get).
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useConvex } from 'convex/react';
import { api } from '../../../lib/convex';
import { useAppSelector } from '../../../store/hooks';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../../assets/design-system';

type Author = { first_name: string; last_name: string; status: string | null; specialty: string | null };
type DiscussionDetail = {
  id: string;
  title: string;
  content: string;
  specialty?: string | null;
  created_at: number;
  vote_count: number;
  user_vote: number | null;
  author: Author;
};
type Comment = {
  id: string;
  content: string;
  created_at: number;
  vote_count: number;
  user_vote: number | null;
  author: Author;
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

export default function DiscussionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const convex = useConvex();
  const { user, isAnonymous } = useAppSelector((s) => s.auth);
  const profile = useAppSelector((s) => s.profile.profile);
  const loggedIn = !!user && !isAnonymous;

  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  let rawDetail: any = undefined;
  let queryError: string | null = null;
  try {
    rawDetail = useQuery(
      (api as any).discussions?.get,
      id ? ({ id: id as any } as any) : ('skip' as any)
    );
  } catch (e: any) {
    queryError = e?.message || String(e);
  }

  const isLoading = rawDetail === undefined && !queryError;
  const discussion: DiscussionDetail | null = rawDetail?.discussion ?? null;
  const comments: Comment[] = rawDetail?.comments ?? [];

  const handleDiscussionVote = useCallback(
    async (newVote: number) => {
      if (!loggedIn || !discussion) return;
      const target = discussion.user_vote === newVote ? 0 : newVote;
      try {
        await convex.mutation(api.discussions.voteFor as any, {
          discussionId: discussion.id,
          vote: target,
        });
      } catch (e) {
        console.error('[discussion detail] vote error', e);
      }
    },
    [convex, discussion, loggedIn, user]
  );

  const handleCommentVote = useCallback(
    async (commentId: string, currentVote: number | null, newVote: number) => {
      if (!loggedIn) return;
      const target = currentVote === newVote ? 0 : newVote;
      try {
        await convex.mutation(api.discussions.voteCommentFor as any, {
          commentId,
          vote: target,
        });
      } catch (e) {
        console.error('[discussion detail] comment vote error', e);
      }
    },
    [convex, loggedIn, user]
  );

  const submitComment = useCallback(async () => {
    if (!loggedIn || !discussion || !newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      await convex.mutation(api.discussions.addCommentFor as any, {
        discussionId: discussion.id,
        content: newComment.trim(),
      });
      setNewComment('');
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible de publier le commentaire');
    } finally {
      setSubmitting(false);
    }
  }, [convex, discussion, loggedIn, newComment, profile, submitting, user]);

  // --- Rendu conditionnels : pas connecté / chargement / not found ---
  if (!loggedIn) {
    return (
      <View style={styles.container}>
        <TopBar onBack={() => router.back()} />
        <View style={styles.centerContainer}>
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary.main} />
          </View>
          <Text style={styles.emptyTitle}>Réservé aux membres</Text>
          <Text style={styles.emptyText}>
            Connectez-vous pour lire cette discussion et échanger avec vos confrères.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/profile')}
          >
            <Text style={styles.primaryButtonText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <TopBar onBack={() => router.back()} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary.main} />
        </View>
      </View>
    );
  }

  if (!discussion) {
    return (
      <View style={styles.container}>
        <TopBar onBack={() => router.back()} />
        <View style={styles.centerContainer}>
          <Text style={styles.emptyTitle}>Discussion introuvable</Text>
          <Text style={styles.emptyText}>Ce sujet n'existe pas ou a été supprimé.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/discussions')}>
            <Text style={styles.primaryButtonText}>Toutes les discussions</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <TopBar onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Discussion */}
        <View style={styles.discussionRow}>
          <View style={styles.voteCol}>
            <TouchableOpacity onPress={() => handleDiscussionVote(1)} hitSlop={8}>
              <Ionicons
                name={discussion.user_vote === 1 ? 'chevron-up-circle' : 'chevron-up-circle-outline'}
                size={26}
                color={discussion.user_vote === 1 ? COLORS.primary.main : COLORS.icon.secondary}
              />
            </TouchableOpacity>
            <Text
              style={[
                styles.voteCountLarge,
                discussion.vote_count > 0
                  ? { color: COLORS.primary.main }
                  : discussion.vote_count < 0
                  ? { color: COLORS.error }
                  : null,
              ]}
            >
              {discussion.vote_count}
            </Text>
            <TouchableOpacity onPress={() => handleDiscussionVote(-1)} hitSlop={8}>
              <Ionicons
                name={discussion.user_vote === -1 ? 'chevron-down-circle' : 'chevron-down-circle-outline'}
                size={26}
                color={discussion.user_vote === -1 ? COLORS.error : COLORS.icon.secondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.discussionBody}>
            <View style={styles.metaRow}>
              <Text style={styles.metaAuthor}>
                {discussion.author.first_name} {discussion.author.last_name}
              </Text>
              {discussion.author.status ? (
                <Text style={styles.metaStatus}>{discussion.author.status}</Text>
              ) : null}
              {discussion.author.specialty ? (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaStatus}>{discussion.author.specialty}</Text>
                </>
              ) : null}
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaTime}>{timeAgo(discussion.created_at)}</Text>
            </View>

            <Text style={styles.discussionTitle}>{discussion.title}</Text>

            {discussion.specialty ? (
              <Text style={styles.specialtyTag}>{discussion.specialty}</Text>
            ) : null}

            <Text style={styles.discussionContent}>{discussion.content}</Text>
          </View>
        </View>

        {/* Compteur commentaires */}
        <Text style={styles.commentsHeader}>
          {comments.length} COMMENTAIRE{comments.length !== 1 ? 'S' : ''}
        </Text>

        {/* Composer */}
        <View style={styles.composer}>
          <TextInput
            style={styles.composerInput}
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Ajouter un commentaire…"
            placeholderTextColor={COLORS.text.disabled}
            multiline
            textAlignVertical="top"
          />
          <View style={styles.composerActions}>
            <TouchableOpacity
              style={[
                styles.publishButton,
                (!newComment.trim() || submitting) && { opacity: 0.4 },
              ]}
              onPress={submitComment}
              disabled={!newComment.trim() || submitting}
            >
              <Text style={styles.publishButtonText}>
                {submitting ? 'Envoi…' : 'Commenter'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Liste des commentaires */}
        <View style={styles.commentsList}>
          {comments.map((c) => (
            <View key={c.id} style={styles.commentRow}>
              <View style={styles.commentVoteCol}>
                <TouchableOpacity onPress={() => handleCommentVote(c.id, c.user_vote, 1)} hitSlop={6}>
                  <Ionicons
                    name={c.user_vote === 1 ? 'chevron-up-circle' : 'chevron-up-circle-outline'}
                    size={18}
                    color={c.user_vote === 1 ? COLORS.primary.main : COLORS.icon.secondary}
                  />
                </TouchableOpacity>
                <Text
                  style={[
                    styles.commentVoteCount,
                    c.vote_count > 0
                      ? { color: COLORS.primary.main }
                      : c.vote_count < 0
                      ? { color: COLORS.error }
                      : null,
                  ]}
                >
                  {c.vote_count}
                </Text>
                <TouchableOpacity onPress={() => handleCommentVote(c.id, c.user_vote, -1)} hitSlop={6}>
                  <Ionicons
                    name={c.user_vote === -1 ? 'chevron-down-circle' : 'chevron-down-circle-outline'}
                    size={18}
                    color={c.user_vote === -1 ? COLORS.error : COLORS.icon.secondary}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.commentBody}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaAuthorSmall}>
                    {c.author.first_name} {c.author.last_name}
                  </Text>
                  {c.author.status ? (
                    <Text style={styles.metaStatus}>{c.author.status}</Text>
                  ) : null}
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaTime}>{timeAgo(c.created_at)}</Text>
                </View>
                <Text style={styles.commentContent}>{c.content}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function TopBar({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.topBar}>
      <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color={COLORS.icon.primary} />
        <Text style={styles.backButtonText}>Discussions</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  topBar: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
    backgroundColor: COLORS.background.primary,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backButtonText: {
    ...TYPOGRAPHY.label.medium,
    color: COLORS.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
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
  primaryButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  primaryButtonText: {
    ...TYPOGRAPHY.button.medium,
    color: COLORS.text.white,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  discussionRow: {
    flexDirection: 'row',
    padding: SPACING.base,
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  voteCol: {
    width: 40,
    alignItems: 'center',
    gap: 4,
    paddingTop: 2,
  },
  voteCountLarge: {
    ...TYPOGRAPHY.label.large,
    color: COLORS.text.tertiary,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
  discussionBody: {
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  metaAuthor: {
    ...TYPOGRAPHY.label.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  metaAuthorSmall: {
    ...TYPOGRAPHY.label.small,
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
  discussionTitle: {
    ...TYPOGRAPHY.heading.h1,
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  specialtyTag: {
    ...TYPOGRAPHY.label.small,
    color: COLORS.primary.main,
    fontWeight: '600',
    marginBottom: 12,
  },
  discussionContent: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
  },
  commentsHeader: {
    ...TYPOGRAPHY.overline,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xl,
    marginBottom: SPACING.base,
    paddingHorizontal: SPACING.base,
  },
  composer: {
    marginHorizontal: SPACING.base,
    marginBottom: SPACING.xl,
    paddingBottom: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  composerInput: {
    borderWidth: 1,
    borderColor: COLORS.border.light,
    padding: SPACING.md,
    minHeight: 80,
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.primary,
  },
  composerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.sm,
  },
  publishButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  publishButtonText: {
    ...TYPOGRAPHY.button.small,
    color: COLORS.text.white,
  },
  commentsList: {
    paddingHorizontal: SPACING.base,
  },
  commentRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingVertical: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  commentVoteCol: {
    width: 28,
    alignItems: 'center',
    gap: 2,
    paddingTop: 2,
  },
  commentVoteCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
  commentBody: {
    flex: 1,
    minWidth: 0,
  },
  commentContent: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
  },
});
