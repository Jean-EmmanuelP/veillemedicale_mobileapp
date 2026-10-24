/**
 * Messagerie — hub combinant Messages (DM) et Chat live via tabs iOS-style.
 * Pattern "1 tab, 2 sous-vues" pour garder la tab bar à 5 items.
 * Chaque sous-vue reste accessible en deep-link via /messages et /live-chat.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Pressable,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useAppSelector } from '../../../store/hooks';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../../assets/design-system';
import MessagesScreen from '../messages/index';
import LiveChatScreen from '../live-chat/index';

type Tab = 'messages' | 'live-chat';

const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'messages', label: 'Messages', icon: 'mail-outline', iconActive: 'mail' },
  { key: 'live-chat', label: 'Chat live', icon: 'chatbubble-ellipses-outline', iconActive: 'chatbubble-ellipses' },
];

// Seuils du swipe horizontal entre les deux sous-écrans.
// `activeOffsetX` / `failOffsetY` évitent d'interférer avec le scroll vertical des listes.
const SWIPE_ACTIVATE_X = 15;
const SWIPE_FAIL_Y = 15;
const SWIPE_COMMIT_DISTANCE = 60;
const SWIPE_COMMIT_VELOCITY = 500;

export default function MessagerieScreen() {
  const [active, setActive] = useState<Tab>('messages');
  const router = useRouter();
  const { isAnonymous } = useAppSelector((s) => s.auth);
  const { width } = useWindowDimensions();

  // Indicator underline animé
  const indicatorX = useRef(new Animated.Value(0)).current;
  const tabsRowWidth = width - SPACING.base * 2;
  const tabWidth = tabsRowWidth / TABS.length;

  useEffect(() => {
    const idx = TABS.findIndex((t) => t.key === active);
    Animated.spring(indicatorX, {
      toValue: idx * tabWidth,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  }, [active, tabWidth, indicatorX]);

  // Swipe horizontal sur le body pour switcher Messages ↔ Chat live.
  // `.runOnJS(true)` = callback JS-thread, on peut appeler setActive directement.
  // Commit si distance suffisante OU vélocité franche (feeling natif iOS).
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-SWIPE_ACTIVATE_X, SWIPE_ACTIVATE_X])
    .failOffsetY([-SWIPE_FAIL_Y, SWIPE_FAIL_Y])
    .onEnd((event) => {
      const dx = event.translationX;
      const vx = event.velocityX;
      const goLeft = dx < -SWIPE_COMMIT_DISTANCE || vx < -SWIPE_COMMIT_VELOCITY;
      const goRight = dx > SWIPE_COMMIT_DISTANCE || vx > SWIPE_COMMIT_VELOCITY;
      if (goLeft && active === 'messages') setActive('live-chat');
      else if (goRight && active === 'live-chat') setActive('messages');
    })
    .runOnJS(true);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* Ligne du haut : actions à droite uniquement (pas de titre — les tabs disent tout) */}
        <View style={styles.actionsRow}>
          <View style={{ flex: 1 }} />
          <Pressable style={styles.iconBtn} onPress={() => router.push('/search')}>
            <Ionicons name="search-outline" size={22} color={COLORS.icon.primary} />
          </Pressable>
          {isAnonymous ? (
            <Pressable style={styles.createAccountBtn} onPress={() => router.push('/profile')}>
              <Ionicons name="person-add-outline" size={14} color={COLORS.text.white} />
              <Text style={styles.createAccountText}>Créer un compte</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.iconBtn} onPress={() => router.push('/profile')}>
              <Ionicons name="person-circle-outline" size={26} color={COLORS.icon.primary} />
            </Pressable>
          )}
        </View>

        {/* Onglets style iOS avec underline animé */}
        <View style={[styles.tabsRow, { width: tabsRowWidth }]}>
          {TABS.map((t) => {
            const isActive = active === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tab, { width: tabWidth }]}
                onPress={() => setActive(t.key)}
                activeOpacity={0.6}
              >
                <Ionicons
                  name={isActive ? t.iconActive : t.icon}
                  size={17}
                  color={isActive ? COLORS.primary.main : COLORS.text.secondary}
                />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
          <Animated.View
            style={[
              styles.indicator,
              {
                width: tabWidth - SPACING.md * 2,
                transform: [{ translateX: Animated.add(indicatorX, new Animated.Value(SPACING.md)) }],
              },
            ]}
          />
        </View>
      </View>

      {/* Body : sous-écran (header désactivé). Swipe horizontal pour changer d'onglet. */}
      <GestureDetector gesture={swipeGesture}>
        <View style={styles.body}>
          {active === 'messages' ? <MessagesScreen hideHeader /> : <LiveChatScreen hideHeader />}
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background.primary },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: SPACING.base,
    backgroundColor: COLORS.background.primary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  iconBtn: {
    padding: SPACING.xs,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
  },
  createAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
  },
  createAccountText: { ...TYPOGRAPHY.label.small, color: COLORS.text.white, fontWeight: '600' },
  tabsRow: {
    flexDirection: 'row',
    position: 'relative',
    marginTop: SPACING.xs,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    gap: 6,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    letterSpacing: 0.1,
  },
  tabLabelActive: { color: COLORS.primary.main },
  indicator: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 2.5,
    backgroundColor: COLORS.primary.main,
    borderRadius: 2,
  },
  body: { flex: 1 },
});
