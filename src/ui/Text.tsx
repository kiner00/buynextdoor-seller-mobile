import { Text as RNText, type TextProps } from 'react-native';
import { cn } from '../lib/cn';

/**
 * Text with the app's defaults baked in. React Native's <Text> inherits
 * nothing, so without a wrapper every single label re-declares its colour and
 * size — and the ones that forget render as 14px pure black, which is how a
 * design drifts.
 */
export function Text({ className, ...props }: TextProps & { className?: string }) {
  return <RNText className={cn('text-[15px] text-neutral-900', className)} {...props} />;
}

export function Heading({ className, ...props }: TextProps & { className?: string }) {
  return <RNText className={cn('text-xl font-semibold text-neutral-900', className)} {...props} />;
}

export function Muted({ className, ...props }: TextProps & { className?: string }) {
  return <RNText className={cn('text-[13px] text-neutral-500', className)} {...props} />;
}
