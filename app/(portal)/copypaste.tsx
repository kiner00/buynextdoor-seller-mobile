import { Stack } from 'expo-router';
import { NotBuiltYet } from '../../src/ui';

export default function CopypasteScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Copypaste posting' }} />
      <NotBuiltYet title="Copypaste posting" webPath="/copypaste" />
    </>
  );
}
