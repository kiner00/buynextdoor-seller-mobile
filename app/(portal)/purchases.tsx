import { Stack } from 'expo-router';
import { NotBuiltYet } from '../../src/ui';

export default function PurchasesScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Purchases' }} />
      <NotBuiltYet title="Purchases" webPath="/purchases" />
    </>
  );
}
