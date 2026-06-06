import { QueryClient } from '@tanstack/react-query';
import { dashboardService } from './dashboardService';
import { profileService } from './profileService';
import { foodService } from './foodService';
import { workoutService } from './workoutService';
import { weightService } from './weightService';
import { coachService } from './coachService';
import { hydrationService } from './hydrationService';
import { goalSnapshotService } from './goalSnapshotService';

export const FIVE_MINUTES = 5 * 60 * 1000;
export const THIRTY_MINUTES = 30 * 60 * 1000;

export const queryKeys = {
  coach: ['coach'],
  dashboard: ['dashboard'],
  exercises: ['exercises'],
  goals: ['goals'],
  nutrition: (date) => ['nutrition', date],
  profile: ['profile'],
  progress: ['progress'],
  weight: ['weight'],
  workouts: (date) => ['workouts', date],
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: FIVE_MINUTES,
      gcTime: THIRTY_MINUTES,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const todayKey = () => new Date().toISOString().split('T')[0];

const getWeekDates = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() + mondayOffset + index);
    return date.toISOString().split('T')[0];
  });
};

export const fetchGoalsData = async () => {
  const today = todayKey();
  const weekDates = getWeekDates();
  const weekPromises = weekDates.map((date) => workoutService.getWorkouts(date).catch(() => []));

  const [profileRes, summaryRes, coachRes, coachHistoryRes, weightsRes, goalRes, hydRes, ...weekRes] = await Promise.all([
    profileService.getProfile().catch(() => null),
    foodService.getDailySummary(today).catch(() => ({ calories: 0, protein: 0, carbs: 0, fat: 0 })),
    coachService.getCoach().catch(() => null),
    coachService.getHistory(30).catch(() => []),
    weightService.getWeightEntries(30).catch(() => []),
    goalSnapshotService.getCurrentGoalSnapshot().catch(() => null),
    hydrationService.getSummary(today).catch(() => null),
    ...weekPromises,
  ]);

  return {
    profile: profileRes?.profile || null,
    targets: profileRes?.targets || goalRes || null,
    summary: summaryRes || { calories: 0, protein: 0, carbs: 0, fat: 0 },
    coach: coachRes,
    coachHistory: coachHistoryRes || [],
    weights: weightsRes || [],
    goalSnapshot: goalRes,
    hydration: hydRes,
    weekWorkouts: weekRes.flat(),
  };
};

export const prefetchMainTabs = () => {
  const today = todayKey();

  queryClient.prefetchQuery({ queryKey: queryKeys.dashboard, queryFn: dashboardService.getDashboard });
  queryClient.prefetchQuery({ queryKey: queryKeys.goals, queryFn: fetchGoalsData });
  queryClient.prefetchQuery({
    queryKey: queryKeys.nutrition(today),
    queryFn: async () => {
      const [entries, summary, profile, hydration] = await Promise.all([
        foodService.getFoodEntries(today),
        foodService.getDailySummary(today).catch(() => ({ calories: 0, protein: 0, carbs: 0, fat: 0 })),
        profileService.getProfile().catch(() => null),
        hydrationService.getSummary(today).catch(() => ({ totalMl: 0, targetMl: 2500, progress: 0 })),
      ]);
      return { entries, summary, profile, hydration };
    },
  });
  queryClient.prefetchQuery({ queryKey: queryKeys.workouts(today), queryFn: () => workoutService.getWorkouts(today) });
  queryClient.prefetchQuery({
    queryKey: queryKeys.progress,
    queryFn: async () => {
      const [entries, stats] = await Promise.all([
        weightService.getWeightEntries(30),
        weightService.getWeightStats().catch(() => null),
      ]);
      return { entries, stats };
    },
  });
};
