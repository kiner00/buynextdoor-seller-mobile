import { Stack } from 'expo-router';
import { NotBuiltYet } from '../../src/ui';

export default function BillingScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Billing' }} />
      <NotBuiltYet title="Billing" webPath="/billing" />
    </>
  );
}
