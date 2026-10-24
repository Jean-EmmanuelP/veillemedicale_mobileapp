import { useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { hideTabBar, showTabBar } from '../store/uiSlice';
import { RootState } from '../store';

const SCROLL_THRESHOLD = 8; // px of change before triggering
const TOP_ZONE = 20; // px near the top where tab bar always shows

/**
 * Hook to auto-hide the bottom tab bar on scroll-down and show it on scroll-up.
 * Usage:
 *   const onScroll = useTabBarScroll();
 *   <FlatList onScroll={onScroll} scrollEventThrottle={16} ... />
 */
export function useTabBarScroll() {
  const dispatch = useDispatch();
  const lastY = useRef(0);
  const visible = useSelector((s: RootState) => s.ui.tabBarVisible);

  return (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const delta = y - lastY.current;

    // Always show near the top
    if (y < TOP_ZONE) {
      if (!visible) dispatch(showTabBar());
      lastY.current = y;
      return;
    }

    if (Math.abs(delta) < SCROLL_THRESHOLD) return;

    if (delta > 0 && visible) {
      dispatch(hideTabBar());
    } else if (delta < 0 && !visible) {
      dispatch(showTabBar());
    }
    lastY.current = y;
  };
}
