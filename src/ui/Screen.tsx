import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/tokens';

/**
 * Standard page frame: safe-area aware, scrollable, pull-to-refresh.
 *
 * Pull-to-refresh is here rather than per screen because on a phone it is the
 * expected way to ask "is this current?" — a seller will try it on every list
 * whether or not we built it, and a screen where it does nothing reads as
 * broken.
 */
export function Screen({
  children,
  onRefresh,
  refreshing = false,
  scrollable = true,
  className,
}: {
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  scrollable?: boolean;
  className?: string;
}) {
  const insets = useSafeAreaInsets();
  // Bottom inset only — the header owns the top, and a tab bar owns its own.
  const contentPadding = { paddingBottom: insets.bottom + 24 };

  if (!scrollable) {
    return <View className={className ?? 'flex-1 bg-neutral-50'}>{children}</View>;
  }

  return (
    <ScrollView
      className={className ?? 'flex-1 bg-neutral-50'}
      contentContainerStyle={contentPadding}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand[600]}
            colors={[colors.brand[600]]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}
