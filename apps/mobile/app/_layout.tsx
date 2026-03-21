import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { screenOptions } from './_layout.styles';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={screenOptions} />
    </>
  );
}
