import z from "zod";

const ConsistencyDaySchema = z.object({
  workoutDayCompleted: z.boolean(),
  workoutDayStarted: z.boolean(),
});

export const GetStatsQuerySchema = z
  .object({
    from: z.iso.date(),
    to: z.iso.date(),
  })
  .refine((data) => data.to >= data.from, {
    message: "Date 'to' must be greater than or equal to 'from'",
    path: ["to"],
  });

export const GetStatsResponseSchema = z.object({
  workoutStreak: z.number().int().min(0),
  consistencyByDay: z.record(z.string(), ConsistencyDaySchema),
  completedWorkoutsCount: z.number().int().min(0),
  conclusionRate: z.number().min(0).max(1),
  totalTimeInSeconds: z.number().int().min(0),
});
