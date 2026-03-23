import z from "zod";

import { WeekDay } from "../generated/prisma/enums.js";

export const ErrorSchema = z.object({
  message: z.string(),
  code: z.string(),
});

export const StartWorkoutSessionResponseSchema = z.object({
  userWorkoutSessionId: z.string().cuid(),
});

export const StartWorkoutSessionParamsSchema = z.object({
  workoutPlanId: z.string().cuid(),
  workoutDayId: z.string().cuid(),
});

export const UpdateWorkoutSessionParamsSchema = z.object({
  workoutPlanId: z.string().cuid(),
  workoutDayId: z.string().cuid(),
  sessionId: z.string().cuid(),
});

export const UpdateWorkoutSessionBodySchema = z.object({
  completedAt: z.string().datetime(),
});

export const UpdateWorkoutSessionResponseSchema = z.object({
  id: z.string().cuid(),
  completedAt: z.string().datetime(),
  startedAt: z.string().datetime(),
});

export const GetWorkoutDayParamsSchema = z.object({
  workoutPlanId: z.string().cuid(),
  workoutDayId: z.string().cuid(),
});

export const GetWorkoutDayResponseSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  isRest: z.boolean(),
  coverImageUrl: z.string().url().optional(),
  estimatedDurationInSeconds: z.number().int().positive(),
  exercises: z.array(
    z.object({
      id: z.string().cuid(),
      order: z.number().int(),
      name: z.string(),
      sets: z.number().int().positive(),
      reps: z.number().int().positive(),
      restTimeInSeconds: z.number().int().positive(),
      workoutDayId: z.string().cuid(),
    }),
  ),
  weekDay: z.enum(WeekDay),
  sessions: z.array(
    z.object({
      id: z.string().cuid(),
      workoutDayId: z.string().cuid(),
      startedAt: z.string().optional(),
      completedAt: z.string().optional(),
    }),
  ),
});

export const ListWorkoutPlansQuerySchema = z.object({
  active: z
    .string()
    .optional()
    .transform((val) =>
      val === "true" ? true : val === "false" ? false : undefined,
    ),
});

const ListWorkoutPlanExerciseSchema = z.object({
  id: z.string().cuid(),
  order: z.number().int(),
  name: z.string(),
  sets: z.number().int().positive(),
  reps: z.number().int().positive(),
  restTimeInSeconds: z.number().int().positive(),
  workoutDayId: z.string().cuid(),
});

const ListWorkoutPlanDaySchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  isRest: z.boolean(),
  weekDay: z.enum(WeekDay),
  coverImageUrl: z.string().url().optional(),
  estimatedDurationInSeconds: z.number().int().positive(),
  exercises: z.array(ListWorkoutPlanExerciseSchema),
});

export const ListWorkoutPlansResponseSchema = z.object({
  workoutPlans: z.array(
    z.object({
      id: z.string().cuid(),
      name: z.string(),
      isActive: z.boolean(),
      workoutDays: z.array(ListWorkoutPlanDaySchema),
    }),
  ),
});

export const GetWorkoutPlanParamsSchema = z.object({
  id: z.string().cuid(),
});

export const GetWorkoutPlanResponseSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  workoutDays: z.array(
    z.object({
      id: z.string().cuid(),
      weekDay: z.enum(WeekDay),
      name: z.string(),
      isRest: z.boolean(),
      coverImageUrl: z.string().url().optional(),
      estimatedDurationInSeconds: z.number().int().positive(),
      exercisesCount: z.number().int().min(0),
    }),
  ),
});

export const WorkoutPlanSchema = z.object({
  id: z.cuid(),
  name: z.string().trim().min(1, { message: "Nome é obrigatório" }),
  workoutDays: z.array(
    z.object({
      name: z.string().trim().min(1, { message: "Nome é obrigatório" }),
      weekDay: z.enum(WeekDay),
      isRest: z.boolean().default(false),
      coverImageUrl: z.string().url().optional(),
      estimatedDurationInSeconds: z
        .number()
        .int()
        .min(1, { message: "Duração estimada é obrigatória" })
        .positive({ message: "Duração estimada é obrigatória" }),
      exercises: z.array(
        z.object({
          order: z.number().int().min(0, { message: "Ordem é obrigatória" }),
          name: z.string().trim().min(1, { message: "Nome é obrigatório" }),
          sets: z
            .number()
            .int()
            .min(1, { message: "Sets é obrigatório" })
            .positive({ message: "Sets é obrigatório" }),
          reps: z
            .number()
            .int()
            .min(1, { message: "Repetições é obrigatório" })
            .positive({ message: "Repetições é obrigatório" }),
          restTimeInSeconds: z
            .number()
            .int()
            .min(1, { message: "Tempo de descanso é obrigatório" })
            .positive({ message: "Tempo de descanso é obrigatório" }),
        }),
      ),
    }),
  ),
});
