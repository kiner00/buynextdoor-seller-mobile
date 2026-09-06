import { Stack } from 'expo-router';
import { NotBuiltYet } from '../../src/ui';

export default function BranchesScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Branches' }} />
      <NotBuiltYet title="Branches" webPath="/branches" />
    </>
  );
}
