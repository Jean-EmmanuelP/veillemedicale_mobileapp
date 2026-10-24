import { Stack } from 'expo-router';
import React from 'react';

// Stack imbriqué pour la section Discussions.
// - index : liste
// - [id] : détail + commentaires
export default function DiscussionsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
