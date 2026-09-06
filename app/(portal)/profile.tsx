import { Stack } from 'expo-router';
import { NotBuiltYet } from '../../src/ui';

export default function ProfileScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Seller profile' }} />
      <NotBuiltYet title="Seller profile" webPath="/profile" />
    </>
  );
}
