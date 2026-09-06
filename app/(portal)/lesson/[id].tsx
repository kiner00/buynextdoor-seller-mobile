import { useEffect, useMemo } from 'react';
import { Linking, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useLessonProgress, useTrainings } from '../../../src/api/domains/trainings';
import { Button, Card, ErrorState, LoadingState, Muted, Screen, Text } from '../../../src/ui';

/** Strips tags for a plain-text read; lesson bodies are simple TipTap HTML. */
function plainText(html: string | null): string {
  if (!html) return '';
  return html
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim();
}

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lessonId = Number(id);
  const tracks = useTrainings();
  const progress = useLessonProgress();

  const lesson = useMemo(
    () => tracks.data?.flatMap((track) => track.lessons).find((entry) => entry.id === lessonId),
    [tracks.data, lessonId],
  );

  // Opening a lesson starts it. Fire-and-forget: a failure here changes nothing
  // the seller can see.
  useEffect(() => {
    if (lesson && lesson.progress_status === null) {
      progress.mutate({ lessonId: lesson.id, status: 'started' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id]);

  if (tracks.isPending) return <LoadingState />;
  if (tracks.isError)
    return <ErrorState error={tracks.error} onRetry={() => void tracks.refetch()} />;
  if (!lesson) return <ErrorState error={new Error('Lesson not found.')} />;

  const done = lesson.progress_status === 'completed';

  return (
    <>
      <Stack.Screen options={{ title: lesson.title }} />
      <Screen>
        <View className="gap-4 p-4">
          {lesson.summary ? <Muted>{lesson.summary}</Muted> : null}
          {lesson.media_url ? (
            <Button
              label={lesson.format === 'video' ? 'Watch video' : 'Open material'}
              onPress={() => void Linking.openURL(lesson.media_url!)}
            />
          ) : null}
          {lesson.body_html ? (
            <Card>
              <Text className="text-[15px] leading-6">{plainText(lesson.body_html)}</Text>
            </Card>
          ) : null}
          <Button
            label={done ? 'Completed' : 'Mark as completed'}
            variant={done ? 'secondary' : 'primary'}
            disabled={done}
            loading={progress.isPending}
            onPress={() => progress.mutate({ lessonId: lesson.id, status: 'completed' })}
          />
        </View>
      </Screen>
    </>
  );
}
