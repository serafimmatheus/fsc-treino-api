import type { WeekDay } from "../../../generated/prisma/enums.js";

export interface CreateWorkoutPlanRepositoryData {
  userId: string;
  name: string;
  workoutDays: CreateWorkoutDayRepositoryData[];
}

export interface CreateWorkoutDayRepositoryData {
  name: string;
  weekDay: WeekDay;
  isRest: boolean;
  coverImageUrl?: string;
  estimatedDurationInSeconds: number;
  exercises: CreateWorkoutExerciseRepositoryData[];
}

export interface CreateWorkoutExerciseRepositoryData {
  order: number;
  name: string;
  sets: number;
  reps: number;
  restTimeInSeconds: number;
}

export interface WorkoutPlanWithRelations {
  id: string;
  name: string;
  workoutDays: Array<{
    id: string;
    name: string;
    weekDay: WeekDay;
    coverImageUrl: string | null;
    estimatedDurationInSeconds: number;
    workoutExercises: Array<{
      order: number;
      name: string;
      sets: number;
      reps: number;
      restTimeInSeconds: number;
    }>;
  }>;
}

export interface WorkoutPlanById {
  id: string;
  userId: string;
  workoutDays: Array<{ id: string }>;
}

export interface WorkoutPlanActiveWithDetails {
  id: string;
  name: string;
  workoutDays: Array<{
    id: string;
    name: string;
    isRest: boolean;
    weekDay: WeekDay;
    coverImageUrl: string | null;
    estimatedDurationInSeconds: number;
    workoutExercises: Array<{
      order: number;
      name: string;
      sets: number;
      reps: number;
      restTimeInSeconds: number;
    }>;
  }>;
}

export interface WorkoutPlanWithDaysAndExercises {
  id: string;
  name: string;
  isActive: boolean;
  workoutDays: Array<{
    id: string;
    name: string;
    isRest: boolean;
    weekDay: WeekDay;
    coverImageUrl: string | null;
    estimatedDurationInSeconds: number;
    workoutExercises: Array<{
      id: string;
      order: number;
      name: string;
      sets: number;
      reps: number;
      restTimeInSeconds: number;
      workoutDayId: string;
    }>;
  }>;
}

export interface WorkoutPlanWithDaysSummary {
  id: string;
  name: string;
  userId: string;
  workoutDays: Array<{
    id: string;
    weekDay: WeekDay;
    name: string;
    isRest: boolean;
    coverImageUrl: string | null;
    estimatedDurationInSeconds: number;
    exercisesCount: number;
  }>;
}

export interface WorkoutDayWithDetails {
  id: string;
  name: string;
  isRest: boolean;
  weekDay: WeekDay;
  coverImageUrl: string | null;
  estimatedDurationInSeconds: number;
  workoutExercises: Array<{
    id: string;
    order: number;
    name: string;
    sets: number;
    reps: number;
    restTimeInSeconds: number;
    workoutDayId: string;
  }>;
  userWorkoutSessions: Array<{
    id: string;
    workoutDayId: string;
    startedAt: Date;
    completedAt: Date | null;
  }>;
}

export interface IWorkoutPlanRepository {
  findManyByUserId(
    userId: string,
    active?: boolean,
  ): Promise<WorkoutPlanWithDaysAndExercises[]>;
  findById(id: string): Promise<WorkoutPlanById | null>;
  findWorkoutDayByIdWithDetails(
    workoutDayId: string,
    userId: string,
  ): Promise<WorkoutDayWithDetails | null>;
  findByIdWithDaysSummary(
    id: string,
  ): Promise<WorkoutPlanWithDaysSummary | null>;
  findActiveByUserId(
    userId: string,
  ): Promise<WorkoutPlanActiveWithDetails | null>;
  createReplacingActive(
    userId: string,
    data: Omit<CreateWorkoutPlanRepositoryData, "userId">,
  ): Promise<WorkoutPlanWithRelations>;
}
