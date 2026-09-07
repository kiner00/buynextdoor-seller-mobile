import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandLogo } from './BrandLogo';
import { Muted } from './Text';

/**
 * The auth screens' frame, matching the web's AuthBrandShell: a soft brand
 * backdrop, the logo lockup, one elevated card with a brand hairline on top,
 * an optional footnote and the copyright line.
 *
 * The web animates a catalogue drifting behind glass. That is compositor-only
 * CSS there; here it would be a Reanimated layer running on every auth screen
 * for a decorative effect, so the backdrop is the same palette, still. A
 * still backdrop on a 360px phone reads as calm rather than missing.
 */
export function AuthBrandShell({ footnote, children }: { footnote?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-[#f2f7f4]">
      {/* Backdrop: the web's aurora, as two soft brand discs. */}
      <View
        pointerEvents="none"
        className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-48 rounded-full bg-brand-300/25"
      />
      <View
        pointerEvents="none"
        className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-cyan-200/35"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingTop: insets.top + 32,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 20,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center">
            <BrandLogo height={28} />
          </View>

          <View className="mt-7">
            {/* Warm halo so the card lifts off the flat background. */}
            <View
              pointerEvents="none"
              className="absolute -inset-x-3 -bottom-6 top-6 rounded-[36px] bg-brand-300/20"
            />
            <View
              className="overflow-hidden rounded-3xl border border-neutral-200/70 bg-white"
              style={{
                shadowColor: '#101828',
                shadowOpacity: 0.12,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 12 },
                elevation: 6,
              }}
            >
              <View className="h-[3px] bg-brand-500" />
              <View className="p-6">{children}</View>
            </View>
          </View>

          {footnote ? (
            <Muted className="mt-6 text-center text-[12px] leading-5">{footnote}</Muted>
          ) : null}
          <Muted className="mt-2 text-center text-[11px] text-neutral-400">
            © {new Date().getFullYear()} BuyNextDoor
          </Muted>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
