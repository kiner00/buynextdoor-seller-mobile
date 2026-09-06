import { Stack } from 'expo-router';
import { NotBuiltYet } from '../../src/ui';

export default function FinanceScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Finance' }} />
      <NotBuiltYet title="Finance" webPath="/finance" />
    </>
  );
}
