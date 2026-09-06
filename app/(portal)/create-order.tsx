import { Stack } from 'expo-router';
import { NotBuiltYet } from '../../src/ui';

export default function CreateOrderScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Create order' }} />
      <NotBuiltYet title="Create order" webPath="/create-order" />
    </>
  );
}
