import { Stack } from 'expo-router';
import { NotBuiltYet } from '../../src/ui';

export default function ReferralsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Referrals' }} />
      <NotBuiltYet title="Referrals" webPath="/referrals" />
    </>
  );
}
