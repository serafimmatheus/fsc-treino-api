import type { WeekDay } from "../../generated/prisma/enums.js";

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

export interface IWorkoutPlanRepository {
  createReplacingActive(
    userId: string,
    data: Omit<CreateWorkoutPlanRepositoryData, "userId">,
  ): Promise<WorkoutPlanWithRelations>;
}
