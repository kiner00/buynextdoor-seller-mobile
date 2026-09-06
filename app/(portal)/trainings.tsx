import { Stack } from 'expo-router';
import { NotBuiltYet } from '../../src/ui';

export default function TrainingsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Trainings' }} />
      <NotBuiltYet title="Trainings" webPath="/trainings" />
    </>
  );
}
