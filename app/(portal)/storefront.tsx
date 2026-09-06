import { Stack } from 'expo-router';
import { NotBuiltYet } from '../../src/ui';

export default function StorefrontScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Online storefront' }} />
      <NotBuiltYet title="Online storefront" webPath="/storefront" />
    </>
  );
}
