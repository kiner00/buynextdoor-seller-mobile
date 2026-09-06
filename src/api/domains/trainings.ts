import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../client';
import type { ApiEnvelope } from '../types';
import { unwrap } from './shared';

/** `/hubowner/trainings`, verified 2026-09-06 — a bare list of tracks. */
export interface Lesson {
  id: number;
  uuid: string;
  title: string;
  summary: string | null;
  format: string | null;
  body_html: string | null;
  media_url: string | null;
  duration_seconds: number | null;
  sort_order: number;
  is_published: boolean;
  progress_status: 'started' | 'completed' | null;
}

export interface Track {
  id: number;
  uuid: string;
  title: string;
  summary: string | null;
  sort_order: number;
  is_published: boolean;
  lesson_count: number;
  completed_count: number;
  lessons: Lesson[];
}

export interface TrainingSession {
  id?: number;
  title?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  url?: string | null;
  replay_url?: string | null;
}

export const trainingsApi = {
  tracks: () => apiFetch<ApiEnvelope<Track[]>>('/hubowner/trainings').then(unwrap),
  sessions: () =>
    apiFetch<ApiEnvelope<{ upcoming: TrainingSession[]; replays: TrainingSession[] }>>(
      '/hubowner/trainings/sessions',
    ).then(unwrap),
  /** TrainingProgressRequest: `status` is 'started' | 'completed'. */
  progress: (lessonId: number, status: 'started' | 'completed') =>
    apiFetch<ApiEnvelope<unknown>>(`/hubowner/trainings/lessons/${lessonId}/progress`, {
      method: 'POST',
      json: { status },
    }),
};

export function useTrainings() {
  return useQuery({ queryKey: ['trainings', 'tracks'], queryFn: trainingsApi.tracks });
}
export function useTrainingSessions() {
  return useQuery({ queryKey: ['trainings', 'sessions'], queryFn: trainingsApi.sessions });
}
export function useLessonProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, status }: { lessonId: number; status: 'started' | 'completed' }) =>
      trainingsApi.progress(lessonId, status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['trainings'] }),
  });
}
