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
