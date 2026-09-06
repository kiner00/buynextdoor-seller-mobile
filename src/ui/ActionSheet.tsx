import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heading, Text } from './Text';
import { cn } from '../lib/cn';
import { MIN_TOUCH_TARGET } from '../theme/tokens';

export interface SheetAction {
  label: string;
  onPress: () => void;
  /** Destructive actions read red and sort last. */
  destructive?: boolean;
  disabled?: boolean;
}

/**
 * A bottom sheet of choices — the phone answer to a row of buttons.
 *
 * An order has seven possible next states, which is a reasonable toolbar on a
 * desktop and an unusable one at 360px. The screen surfaces the likely next
 * step and puts the rest here, one full-width row each, so nothing needs a
 * precise tap.
 */
export function ActionSheet({
  visible,
  title,
  actions,
  onClose,
}: {
  visible: boolean;
  title: string;
  actions: SheetAction[];
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Tapping the scrim closes, which is what the gesture means everywhere
          else on the platform — and on Android the hardware back does too,
          via onRequestClose. */}
      <Pressable className="flex-1 bg-black/40" onPress={onClose} accessibilityRole="button">
        {/* Swallow taps inside the sheet so they don't reach the scrim. */}
        <Pressable
          className="mt-auto rounded-t-2xl bg-white"
          style={{ paddingBottom: insets.bottom + 12 }}
          onPress={(event) => event.stopPropagation()}
        >
          <View className="items-center py-3">
            <View className="h-1 w-10 rounded-full bg-neutral-300" />
          </View>

          <Heading className="px-5 pb-2 text-base">{title}</Heading>

          <View>
            {actions.map((action) => (
              <Pressable
                key={action.label}
                onPress={() => {
                  onClose();
                  action.onPress();
                }}
                disabled={action.disabled}
                accessibilityRole="button"
                accessibilityState={{ disabled: !!action.disabled }}
                className={cn(
                  'justify-center border-t border-neutral-200 px-5 active:bg-neutral-100',
                  action.disabled && 'opacity-40',
                )}
                style={{ minHeight: MIN_TOUCH_TARGET + 8 }}
              >
                <Text
                  className={cn(
                    'text-[15px]',
                    action.destructive ? 'text-red-600' : 'text-neutral-900',
                  )}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
