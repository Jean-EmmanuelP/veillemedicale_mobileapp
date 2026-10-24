import { Stack } from 'expo-router';
import React from 'react';

// Ralph Social — stack DMs. index = liste de convs, [id] = thread.
export default function MessagesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
