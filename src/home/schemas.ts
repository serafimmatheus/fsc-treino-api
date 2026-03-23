import z from "zod";

import { WeekDay } from "../generated/prisma/enums.js";

export const GetHomeParamsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Date must be in YYYY-MM-DD format",
  }),
});

const ConsistencyDaySchema = z.object({
  workoutDayCompleted: z.boolean(),
  workoutDayStarted: z.boolean(),
});

const TodayWorkoutDaySchema = z.object({
  workoutPlanId: z.string().cuid(),
  id: z.string().cuid(),
  name: z.string(),
  isRest: z.boolean(),
  weekDay: z.enum(WeekDay),
  estimatedDurationInSeconds: z.number().int().positive(),
  coverImageUrl: z.string().url().optional(),
  exercisesCount: z.number().int().min(0),
});

export const GetHomeResponseSchema = z.object({
  activeWorkoutPlanId: z.union([z.string().cuid(), z.null()]),
  todayWorkoutDay: z.union([TodayWorkoutDaySchema, z.null()]),
  workoutStreak: z.number().int().min(0),
  consistencyByDay: z.record(z.string(), ConsistencyDaySchema),
});
