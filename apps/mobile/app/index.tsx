import { Redirect } from 'expo-router';

import { useAuthStore } from '../stores/auth.store';

export default function IndexScreen() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Redirect href="/chats" />;
  }

  return <Redirect href="/auth/login" />;
}
