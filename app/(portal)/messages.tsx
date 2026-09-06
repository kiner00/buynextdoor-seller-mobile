import { Stack } from 'expo-router';
import { NotBuiltYet } from '../../src/ui';

export default function MessagesScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Messages' }} />
      <NotBuiltYet title="Messages" webPath="/messages" />
    </>
  );
}
