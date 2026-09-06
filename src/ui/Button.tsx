import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';
import { Text } from './Text';
import { cn } from '../lib/cn';
import { MIN_TOUCH_TARGET } from '../theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-brand-600 active:bg-brand-700',
  secondary: 'bg-white border border-neutral-300 active:bg-neutral-100',
  ghost: 'bg-transparent active:bg-neutral-100',
  danger: 'bg-red-600 active:bg-red-700',
};

const LABEL: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-neutral-900',
  ghost: 'text-brand-700',
  danger: 'text-white',
};

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  className?: string;
}

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      style={{ minHeight: MIN_TOUCH_TARGET }}
      className={cn(
        'flex-row items-center justify-center rounded-lg px-4',
        CONTAINER[variant],
        inactive && 'opacity-50',
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' || variant === 'ghost' ? '#525252' : '#fff'}
        />
      ) : (
        <Text className={cn('text-[15px] font-semibold', LABEL[variant])}>{label}</Text>
      )}
    </Pressable>
  );
}
