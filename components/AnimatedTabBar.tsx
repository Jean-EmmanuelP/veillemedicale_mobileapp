import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { COLORS, SHADOWS } from '../assets/design-system';

const BAR_HEIGHT_IOS = 68;
const BAR_HEIGHT_ANDROID = 54;
const BOTTOM_INSET_IOS = 20;

// Routes techniques cachées de la tab bar (accès via Profil, deep-link, etc.).
// `href: null` sur Tabs.Screen ne se propage pas toujours en `options.href` visible ici,
// on filtre donc explicitement par nom.
const HIDDEN_ROUTES = new Set(['live-chat', 'messages', 'u', 'experts', '_sitemap', '+not-found']);

export default function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const visible = useSelector((s: RootState) => s.ui.tabBarVisible);
  const translateY = useRef(new Animated.Value(0)).current;
  const totalHeight = (Platform.OS === 'ios' ? BAR_HEIGHT_IOS + BOTTOM_INSET_IOS : BAR_HEIGHT_ANDROID);

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : totalHeight,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, totalHeight, translateY]);

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.container,
        {
          height: totalHeight,
          paddingBottom: Platform.OS === 'ios' ? BOTTOM_INSET_IOS : 6,
          transform: [{ translateY }],
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        // Filtre 1 : liste explicite (fiable même si Expo Router ne propage pas href)
        if (HIDDEN_ROUTES.has(route.name)) return null;
        // Filtre 2 : respect `href: null` in Expo Router (hidden route)
        if ((options as any).href === null) return null;
        const label = (options.tabBarLabel ?? options.title ?? route.name) as string;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name as never);
          }
        };

        const iconColor = isFocused ? COLORS.primary.main : COLORS.icon.secondary;
        const icon = options.tabBarIcon?.({ focused: isFocused, color: iconColor, size: 20 });

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            style={styles.tab}
            android_ripple={{ color: COLORS.border.light, borderless: true, radius: 24 }}
          >
            <View style={styles.iconWrap}>{icon}</View>
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                { color: isFocused ? COLORS.primary.main : COLORS.text.tertiary },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: 4,
    ...SHADOWS.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  iconWrap: {
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 9.5,
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: 0.1,
  },
});
