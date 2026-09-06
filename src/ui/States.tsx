import { ActivityIndicator, View } from 'react-native';
import { Button } from './Button';
import { Heading, Muted } from './Text';
import { ApiError, NetworkError } from '../api/errors';
import { colors } from '../theme/tokens';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 p-8">
      <ActivityIndicator size="large" color={colors.brand[600]} />
      <Muted>{label}</Muted>
    </View>
  );
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <View className="items-center justify-center gap-2 p-8">
      <Heading className="text-center text-base">{title}</Heading>
      {message ? <Muted className="text-center">{message}</Muted> : null}
    </View>
  );
}

/**
 * Turns a thrown error into something a seller can act on. A raw
 * "Request failed with status 500" tells them nothing; "you're offline" and
 * "you don't have access" lead to different actions.
 */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message =
    error instanceof NetworkError
      ? 'No connection. Check your internet and try again.'
      : error instanceof ApiError
        ? error.isForbidden
          ? "Your plan doesn't include this yet."
          : error.message
        : 'Something went wrong.';

  return (
    <View className="items-center justify-center gap-3 p-8">
      <Heading className="text-center text-base">Couldn&apos;t load this</Heading>
      <Muted className="text-center">{message}</Muted>
      {onRetry ? <Button label="Try again" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}
