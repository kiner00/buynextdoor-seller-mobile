import { Stack } from 'expo-router';
import { NotBuiltYet } from '../../src/ui';

export default function ScanScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Scan QR' }} />
      <NotBuiltYet title="Scan QR" webPath="/scan" />
    </>
  );
}
