/**
 * DM thread — LIVE Convex.
 * Pattern inspiré de live-chat/index.tsx : FlatList inversée, useConvex pour l'envoi.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useConvex } from 'convex/react';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../../lib/convex';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { hideTabBar, showTabBar } from '../../../store/uiSlice';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../../assets/design-system';

type Message = {
  id: string;
  conversationId: string;
  authorSupabaseId: string;
  text: string;
  createdAt: number;
  readBy: string[];
};

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

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function DMThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const convex = useConvex();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { user, isAnonymous } = useAppSelector((s) => s.auth);
  const loggedIn = !!user && !isAnonymous;

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message> | null>(null);

  useFocusEffect(
    useCallback(() => {
      dispatch(hideTabBar());
      return () => {
        dispatch(showTabBar());
      };
    }, [dispatch])
  );

  // LIVE : conv + messages. Wrapped try/catch pour ne pas crasher si les queries Convex ne sont pas déployées en prod.
  let convRaw: unknown = undefined;
  let msgRaw: any = undefined;
  let queryError: string | null = null;
  try {
    convRaw = useQuery(
      (api as any).social?.listConversations,
      loggedIn ? ({ supabaseId: user!.id } as any) : ('skip' as any)
    );
    msgRaw = useQuery(
      (api as any).social?.listMessages,
      loggedIn
        ? ({
            supabaseId: user!.id,
            conversationId: id,
            paginationOpts: { numItems: 100, cursor: null },
          } as any)
        : ('skip' as any)
    );
  } catch (e: any) {
    queryError = e?.message || String(e);
  }
  const conversation: Conversation | null = Array.isArray(convRaw)
    ? (convRaw as Conversation[]).find((c: Conversation) => c.id === id) ?? null
    : null;
  const messages: Message[] = msgRaw?.page ?? [];
  const isLoading = msgRaw === undefined && loggedIn && !queryError;

  // Mark read au montage & à chaque nouveau message d'un autre.
  useEffect(() => {
    if (!loggedIn) return;
    convex.mutation(api.social.markRead as any, { supabaseId: user!.id, conversationId: id } as any).catch(() => {});
  }, [id, loggedIn, user?.id, messages.length]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !loggedIn) return;
    setSending(true);
    try {
      await convex.mutation(api.social.sendDirectMessage as any, {
        supabaseId: user!.id,
        conversationId: id,
        text,
      } as any);
      setInput('');
    } catch (e) {
      console.error('[messages/send]', e);
    } finally {
      setSending(false);
    }
  }, [input, sending, loggedIn, user?.id, id, convex]);

  if (!loggedIn) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyBlock}>
          <Text style={styles.emptyText}>Connectez-vous pour accéder à cette conversation.</Text>
        </View>
      </View>
    );
  }

  const dataInverted = [...messages].reverse();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
      keyboardVerticalOffset={insets.top}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={COLORS.text.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.headerName} numberOfLines={1}>
                {conversation?.otherUser.displayName ?? '…'}
              </Text>
              {conversation?.otherUser.verificationStatus === 'verified' && (
                <Ionicons name="checkmark-circle" size={14} color="#3B82F6" />
              )}
            </View>
            {conversation?.otherUser.specialty ? (
              <Text style={styles.headerSpecialty} numberOfLines={1}>
                {conversation.otherUser.specialty}
              </Text>
            ) : null}
          </View>
          {conversation && (
            <TouchableOpacity onPress={() => router.push(`/u/${conversation.otherUser.supabaseId}` as any)}>
              <Ionicons name="person-circle-outline" size={24} color={COLORS.icon.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Messages */}
        {isLoading ? (
          <View style={styles.emptyBlock}>
            <ActivityIndicator />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyText}>Aucun message. Envoyez le premier.</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={dataInverted}
            keyExtractor={(m) => m.id}
            inverted
            contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm }}
            renderItem={({ item }) => {
              const mine = item.authorSupabaseId === user!.id;
              return (
                <View style={[styles.bubbleRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
                  <View
                    style={[
                      styles.bubble,
                      mine ? styles.bubbleMine : styles.bubbleTheirs,
                    ]}
                  >
                    <Text style={mine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>
                      {item.text}
                    </Text>
                    <Text style={[styles.bubbleTime, mine ? { color: 'rgba(255,255,255,0.7)' } : {}]}>
                      {formatTime(item.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Composer */}
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, SPACING.sm) }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Message…"
            placeholderTextColor={COLORS.text.tertiary}
            multiline
            maxLength={2000}
            style={styles.input}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!input.trim() || sending}
            style={[styles.sendBtn, { opacity: !input.trim() || sending ? 0.5 : 1 }]}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  backBtn: { padding: 4 },
  headerName: { ...TYPOGRAPHY.body.medium, fontWeight: '700', color: COLORS.text.primary },
  headerSpecialty: { ...TYPOGRAPHY.body.small, color: COLORS.text.tertiary },
  emptyBlock: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  emptyText: { ...TYPOGRAPHY.body.medium, color: COLORS.text.secondary, textAlign: 'center' },
  bubbleRow: { flexDirection: 'row', marginVertical: 3 },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  bubbleMine: { backgroundColor: COLORS.primary.main },
  bubbleTheirs: { backgroundColor: COLORS.background.tertiary },
  bubbleTextMine: { ...TYPOGRAPHY.body.medium, color: '#fff' },
  bubbleTextTheirs: { ...TYPOGRAPHY.body.medium, color: COLORS.text.primary },
  bubbleTime: { fontSize: 10, marginTop: 3, color: COLORS.text.tertiary },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    backgroundColor: COLORS.background.primary,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
