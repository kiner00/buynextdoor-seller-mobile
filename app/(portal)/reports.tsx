import { Stack } from 'expo-router';
import { NotBuiltYet } from '../../src/ui';

export default function ReportsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Reports' }} />
      <NotBuiltYet title="Reports" webPath="/reports" />
    </>
  );
}
