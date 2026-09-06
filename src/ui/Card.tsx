import { View, type ViewProps } from 'react-native';
import { cn } from '../lib/cn';

export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={cn('rounded-lg border border-neutral-200 bg-white p-4', className)}
      {...props}
    />
  );
}
