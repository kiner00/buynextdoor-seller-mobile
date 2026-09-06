import { Linking, Pressable, View } from 'react-native';
import { Link, Stack } from 'expo-router';
import { CheckCircle2, ChevronRight, PlayCircle } from 'lucide-react-native';
import { useTrainingSessions, useTrainings, type Lesson } from '../../src/api/domains/trainings';
import { formatCount, formatDateTime } from '../../src/lib/format';
import { Card, EmptyState, ErrorState, LoadingState, Muted, Screen, Text } from '../../src/ui';
import { MIN_TOUCH_TARGET, colors } from '../../src/theme/tokens';

export default function TrainingsScreen() {
  const tracks = useTrainings();
  const sessions = useTrainingSessions();

  if (tracks.isPending) return <LoadingState />;
  if (tracks.isError)
    return <ErrorState error={tracks.error} onRetry={() => void tracks.refetch()} />;

  const upcoming = sessions.data?.upcoming ?? [];

  return (
    <>
      <Stack.Screen options={{ title: 'Trainings' }} />
      <Screen
        onRefresh={() => {
          void tracks.refetch();
          void sessions.refetch();
        }}
        refreshing={tracks.isRefetching}
      >
        <View className="gap-4 p-4">
          {upcoming.length > 0 ? (
            <Card className="gap-2 border-brand-200 bg-brand-50">
              <Text className="font-semibold text-brand-900">Upcoming live sessions</Text>
              {upcoming.map((session, index) => (
                <Pressable
                  key={session.id ?? index}
                  onPress={() => session.url && void Linking.openURL(session.url)}
                  disabled={!session.url}
                  className="gap-0.5"
                >
                  <Text className="text-[14px] font-medium">{session.title ?? 'Session'}</Text>
                  <Muted className="text-[12px]">{formatDateTime(session.starts_at)}</Muted>
                </Pressable>
              ))}
            </Card>
          ) : null}

          {tracks.data.length === 0 ? (
            <EmptyState title="No trainings yet" />
          ) : (
            tracks.data.map((track) => (
              <Card key={track.id} className="gap-3">
                <View className="gap-0.5">
                  <Text className="font-semibold">{track.title}</Text>
                  {track.summary ? <Muted>{track.summary}</Muted> : null}
                  <Muted className="text-[12px]">
                    {formatCount(track.completed_count)} of {formatCount(track.lesson_count)} done
                  </Muted>
                </View>
                <View className="overflow-hidden rounded-lg border border-neutral-200">
                  {track.lessons.map((lesson, index) => (
                    <LessonRow key={lesson.id} lesson={lesson} first={index === 0} />
                  ))}
                </View>
              </Card>
            ))
          )}
        </View>
      </Screen>
    </>
  );
}

function LessonRow({ lesson, first }: { lesson: Lesson; first: boolean }) {
  const done = lesson.progress_status === 'completed';
  return (
    <Link href={{ pathname: '/lesson/[id]', params: { id: String(lesson.id) } }} asChild>
      <Pressable
        className={`flex-row items-center gap-3 px-3 active:bg-neutral-100 ${first ? '' : 'border-t border-neutral-200'}`}
        style={{ minHeight: MIN_TOUCH_TARGET + 8 }}
      >
        {done ? (
          <CheckCircle2 size={20} color={colors.success} />
        ) : (
          <PlayCircle size={20} color={colors.neutral[500]} />
        )}
        <View className="flex-1">
          <Text className="text-[14px]" numberOfLines={2}>
            {lesson.title}
          </Text>
          {lesson.format ? <Muted className="text-[12px]">{lesson.format}</Muted> : null}
        </View>
        <ChevronRight size={18} color={colors.neutral[400]} />
      </Pressable>
    </Link>
  );
}
