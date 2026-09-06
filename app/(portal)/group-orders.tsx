import { Stack } from 'expo-router';
import { NotBuiltYet } from '../../src/ui';

export default function GroupOrdersScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Group orders' }} />
      <NotBuiltYet title="Group orders" webPath="/group-orders" />
    </>
  );
}
