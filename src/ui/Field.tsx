import { forwardRef } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { Muted, Text } from './Text';
import { cn } from '../lib/cn';
import { MIN_TOUCH_TARGET, colors } from '../theme/tokens';

export interface FieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  hint?: string;
  className?: string;
}

export const Field = forwardRef<TextInput, FieldProps>(function Field(
  { label, error, hint, className, ...props },
  ref,
) {
  return (
    <View className={cn('gap-1.5', className)}>
      <Text className="text-[13px] font-medium text-neutral-700">{label}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.neutral[400]}
        style={{ minHeight: MIN_TOUCH_TARGET }}
        className={cn(
          'rounded-lg border bg-white px-3 text-[15px] text-neutral-900',
          error ? 'border-red-500' : 'border-neutral-300',
        )}
        {...props}
      />
      {error ? (
        <Text className="text-[13px] text-red-600">{error}</Text>
      ) : hint ? (
        <Muted>{hint}</Muted>
      ) : null}
    </View>
  );
});
