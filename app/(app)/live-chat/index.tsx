/**
 * Live chat — parité avec `/chat` web (frontend Convex `liveChat.ts`).
 * FlatList inversée (messages récents en bas), useQuery LIVE, envoi via convex.mutation.
 *
 * Auth : Supabase (userMirror est l'autorité pour l'auteur dénormalisé côté Convex).
 * Visitors anonymes → invite de connexion.
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
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useConvex } from 'convex/react';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../../lib/convex';
import { useAppSelector } from '../../../store/hooks';
import { useAppDispatch } from '../../../store/hooks';
import { hideTabBar, showTabBar } from '../../../store/uiSlice';
import TopHeader from '../../../components/TopHeader';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../../assets/design-system';

type Room = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: number;
};

type Message = {
  id: string;
  roomId: string;
  text: string;
  createdAt: number;
  editedAt: number | null;
  author: {
    supabaseId: string;
    name: string;
    status: string | null;
    specialty: string | null;
  };
  replyTo: {
    id: string;
    text: string;
    authorName: string;
  } | null;
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function LiveChatScreen({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  const router = useRouter();
  const convex = useConvex();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { user, isAnonymous } = useAppSelector((s) => s.auth);
  const loggedIn = !!user && !isAnonymous;

  // Tab bar height (must stay visible so user can navigate back)
  // iOS: AnimatedTabBar BAR_HEIGHT_IOS(68) + BOTTOM_INSET_IOS(20) = 88
  // Android: BAR_HEIGHT_ANDROID(54)
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 54;

  // Force show tab bar on focus (in case another screen hid it during scroll)
  useFocusEffect(
    useCallback(() => {
      dispatch(showTabBar());
    }, [dispatch])
  );

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const listRef = useRef<FlatList<Message> | null>(null);

  // LIVE — rooms. Wrapped try/catch pour éviter crash si module absent en prod.
  let roomsData: any = undefined;
  let queryError: string | null = null;
  try {
    roomsData = useQuery((api as any).liveChat?.listRooms, {} as any);
  } catch (e: any) {
    queryError = e?.message || String(e);
  }
  const rooms: Room[] = Array.isArray(roomsData) ? (roomsData as Room[]) : [];
  const roomsLoading = roomsData === undefined && !queryError;

  // Warm-up : garantit qu'au moins une room existe (idempotent).
  useEffect(() => {
    if (!loggedIn) return;
    if (!roomsLoading && rooms.length === 0) {
      convex.mutation(api.liveChat.ensureDefaultRooms as any, {} as any).catch(() => {});
    }
  }, [loggedIn, roomsLoading, rooms.length, convex]);

  // Sélectionne la première room dès qu'elles sont chargées.
  useEffect(() => {
    if (!selectedRoomId && rooms.length > 0) {
      const def = rooms.find((r) => r.isDefault) ?? rooms[0];
      setSelectedRoomId(def.id);
    }
  }, [rooms, selectedRoomId]);

  // Reset input quand on change de room.
  useEffect(() => {
    setReplyTo(null);
  }, [selectedRoomId]);

  // LIVE — messages de la room courante.
  let messagesData: any = undefined;
  try {
    messagesData = useQuery(
      (api as any).liveChat?.listMessages,
      selectedRoomId
        ? ({ roomId: selectedRoomId, paginationOpts: { numItems: 100, cursor: null } } as any)
        : ('skip' as any)
    );
  } catch (e: any) {
    queryError = e?.message || String(e);
  }

  const messages: Message[] =
    messagesData && Array.isArray(messagesData.page) ? messagesData.page : [];
  const messagesLoading = selectedRoomId !== null && messagesData === undefined && !queryError;

  // FlatList inversée → on inverse la source pour que les plus récents soient en bas.
  const inverted = React.useMemo(() => [...messages].reverse(), [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !selectedRoomId || !user) return;
    setSending(true);
    try {
      await convex.mutation(api.liveChat.sendMessage as any, {
        roomId: selectedRoomId,
        text,
        replyToId: replyTo?.id,
      } as any);
      setInput('');
      setReplyTo(null);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || "Impossible d'envoyer le message");
    } finally {
      setSending(false);
    }
  }, [input, sending, selectedRoomId, user, convex, replyTo]);

  const deleteMessage = useCallback(
    async (msg: Message) => {
      if (!user) return;
      try {
        await convex.mutation(api.liveChat.deleteMessage as any, {
          messageId: msg.id,
        } as any);
      } catch (e: any) {
        Alert.alert('Erreur', e?.message || 'Suppression impossible');
      }
    },
    [convex, user]
  );

  // Menu contextuel long-press : différent selon qu'on est l'auteur ou non.
  const onLongPressMessage = useCallback(
    (msg: Message) => {
      const isMine = user && msg.author.supabaseId === user.id;
      if (!isMine) {
        setReplyTo(msg);
        return;
      }
      Alert.alert('Options', undefined, [
        { text: 'Répondre', onPress: () => setReplyTo(msg) },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Supprimer ce message ?', 'Cette action est irréversible.', [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Supprimer', style: 'destructive', onPress: () => deleteMessage(msg) },
            ]);
          },
        },
        { text: 'Annuler', style: 'cancel' },
      ]);
    },
    [user, deleteMessage]
  );

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null;

  if (!loggedIn) {
    return (
      <View style={styles.container}>
        {!hideHeader && <TopHeader title="Chat live" />}
        <View style={styles.center}>
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary.main} />
          </View>
          <Text style={styles.emptyTitle}>Réservé aux membres</Text>
          <Text style={styles.emptyText}>
            Connectez-vous pour discuter en direct avec vos confrères.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/profile')}>
            <Text style={styles.primaryButtonText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderItem = ({ item }: { item: Message }) => {
    const isMine = user && item.author.supabaseId === user.id;
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onLongPress={() => onLongPressMessage(item)}
        style={styles.msg}
      >
        {item.replyTo ? (
          <View style={styles.replyPreview}>
            <Ionicons name="return-up-forward" size={12} color={COLORS.text.tertiary} />
            <Text style={styles.replyText} numberOfLines={1}>
              <Text style={styles.replyAuthor}>{item.replyTo.authorName}</Text> — {item.replyTo.text}
            </Text>
          </View>
        ) : null}
        <View style={styles.msgHeader}>
          <Text style={styles.msgAuthor}>{item.author.name}</Text>
          {item.author.status ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.author.status}</Text>
            </View>
          ) : null}
          {item.author.specialty ? (
            <Text style={styles.msgSpecialty}>· {item.author.specialty}</Text>
          ) : null}
          <Text style={styles.msgTime}>{formatTime(item.createdAt)}</Text>
        </View>
        <Text style={styles.msgText}>{item.text}</Text>
        <View style={styles.msgActionsRow}>
          <TouchableOpacity onPress={() => setReplyTo(item)} style={styles.replyBtn} hitSlop={8}>
            <Ionicons name="arrow-undo-outline" size={13} color={COLORS.text.tertiary} />
            <Text style={styles.replyBtnText}>Répondre</Text>
          </TouchableOpacity>
          {isMine && (
            <TouchableOpacity
              onPress={() => {
                Alert.alert('Supprimer ce message ?', 'Cette action est irréversible.', [
                  { text: 'Annuler', style: 'cancel' },
                  { text: 'Supprimer', style: 'destructive', onPress: () => deleteMessage(item) },
                ]);
              }}
              style={styles.deleteBtn}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={13} color={COLORS.error} />
              <Text style={styles.deleteBtnText}>Supprimer</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {!hideHeader && <TopHeader title="Chat live" />}

      {/* Rooms — tabs horizontales */}
      <View style={styles.roomsBar}>
        {roomsLoading ? (
          <ActivityIndicator size="small" color={COLORS.primary.main} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roomsScroll}>
            {rooms.map((r) => {
              const active = r.id === selectedRoomId;
              return (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => setSelectedRoomId(r.id)}
                  style={[styles.roomPill, active && styles.roomPillActive]}
                >
                  <Ionicons
                    name="pricetag-outline"
                    size={12}
                    color={active ? COLORS.text.white : COLORS.text.secondary}
                  />
                  <Text style={[styles.roomPillText, active && styles.roomPillTextActive]}>
                    {r.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {selectedRoom?.description ? (
        <Text style={styles.roomDescription}>{selectedRoom.description}</Text>
      ) : null}

      {/* Messages */}
      <View style={styles.msgListWrap}>
        {messagesLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary.main} />
          </View>
        ) : inverted.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>Aucun message</Text>
            <Text style={styles.emptyText}>Lancez la conversation.</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={inverted}
            renderItem={renderItem}
            keyExtractor={(m) => m.id}
            inverted
            contentContainerStyle={styles.msgList}
            ItemSeparatorComponent={() => <View style={styles.msgSep} />}
          />
        )}
      </View>

      {/* Reply preview */}
      {replyTo ? (
        <View style={styles.replyingBar}>
          <Ionicons name="return-up-forward" size={14} color={COLORS.text.tertiary} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.replyingTitle}>Réponse à {replyTo.author.name}</Text>
            <Text style={styles.replyingText} numberOfLines={1}>
              {replyTo.text}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)} hitSlop={8}>
            <Ionicons name="close" size={18} color={COLORS.text.secondary} />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Input — remonté au-dessus du tab bar pour rester atteignable */}
      <View style={[styles.inputBar, { marginBottom: TAB_BAR_HEIGHT, paddingBottom: 8 }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={selectedRoom ? `Message dans ${selectedRoom.name}…` : 'Choisissez un salon'}
          placeholderTextColor={COLORS.text.disabled}
          style={styles.input}
          multiline
          maxLength={2000}
          editable={!!selectedRoomId && !sending}
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={!input.trim() || sending || !selectedRoomId}
          style={[
            styles.sendBtn,
            (!input.trim() || sending || !selectedRoomId) && styles.sendBtnDisabled,
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color={COLORS.text.white} />
          ) : (
            <Ionicons name="send" size={16} color={COLORS.text.white} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
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
  roomsBar: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
    paddingVertical: SPACING.sm,
  },
  roomsScroll: {
    paddingHorizontal: SPACING.base,
    gap: SPACING.sm,
    alignItems: 'center',
  },
  roomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.primary,
  },
  roomPillActive: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.main,
  },
  roomPillText: {
    ...TYPOGRAPHY.label.small,
    color: COLORS.text.secondary,
  },
  roomPillTextActive: {
    color: COLORS.text.white,
    fontWeight: '600',
  },
  roomDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  msgListWrap: {
    flex: 1,
  },
  msgList: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
  },
  msgSep: {
    height: SPACING.md,
  },
  msg: {
    // Compact discord-like feed
  },
  msgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  msgAuthor: {
    ...TYPOGRAPHY.label.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: COLORS.primary.subtle,
    borderRadius: RADIUS.sm,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primary.main,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  msgSpecialty: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  msgTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginLeft: 'auto',
  },
  msgText: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
    paddingLeft: SPACING.sm,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.border.light,
  },
  replyText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    flex: 1,
  },
  replyAuthor: {
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  msgActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 4,
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyBtnText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteBtnText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
  },
  replyingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    backgroundColor: COLORS.background.secondary,
  },
  replyingTitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  replyingText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    backgroundColor: COLORS.background.primary,
    paddingBottom: Platform.OS === 'ios' ? SPACING.md : SPACING.sm,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderRadius: RADIUS.md,
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.primary,
  },
  sendBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary.main,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.text.disabled,
  },
});
