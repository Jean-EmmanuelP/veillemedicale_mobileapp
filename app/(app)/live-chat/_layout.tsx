/**
 * Live chat — stack layout minimal. Un seul écran (index) pour l'instant.
 * Le header est géré dans l'écran lui-même via TopHeader.
 */
import { Stack } from 'expo-router';

export default function LiveChatLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
