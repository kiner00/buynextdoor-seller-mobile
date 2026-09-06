import { Stack } from 'expo-router';
import { NotBuiltYet } from '../../src/ui';

export default function ActivatedScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Activated products' }} />
      <NotBuiltYet title="Activated products" webPath="/activated" />
    </>
  );
}
