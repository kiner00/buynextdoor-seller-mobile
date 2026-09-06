import { Stack } from 'expo-router';
import { NotBuiltYet } from '../../src/ui';

export default function InventoryScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Inventory' }} />
      <NotBuiltYet title="Inventory" webPath="/inventory" />
    </>
  );
}
