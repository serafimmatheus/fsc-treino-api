import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  UIMessage,
} from "ai";
import { fromNodeHeaders } from "better-auth/node";
import { FastifyInstance } from "fastify";
import z from "zod";

import { WeekDay } from "../../generated/prisma/enums.js";
import { auth } from "../../lib/auth.js";
import { prisma } from "../../lib/db.js";
import { PrismaWorkoutPlanRepository } from "../../workout-plan/Repositories/PrismaWorkoutPlanRepository.js";
import { CreateWorkoutPlan } from "../../workout-plan/UseCases/CreateWorkoutPlan.js";

export const iaRoutes = async (app: FastifyInstance) => {
  app.get("/ia", async (request, reply) => {
    const { messages } = request.body as { messages: UIMessage[] };
    const result = streamText({
      model: "gpt-4o-mini",
      tools: {
        getUserTrainData: tool({
          description: "Get the user's training data",
          inputSchema: z.object({
            id: z.string().cuid(),
          }),
          execute: async (input) => {
            return input;
          },
        }),
        updateUserTrainData: tool({
          description: "Update the user's training data",
          inputSchema: z.object({
            name: z.string().trim().min(1, { message: "Nome é obrigatório" }),
          }),
          execute: async (input) => {
            return input;
          },
        }),
        getWorkoutPlan: tool({
          description: "Get a workout plan",
          inputSchema: z.object({
            id: z.cuid(),
          }),
          execute: async (input) => {
            const workoutPlanRepository = new PrismaWorkoutPlanRepository(
              prisma,
            );
            const workoutPlan = await workoutPlanRepository.findById(input.id);

            if (!workoutPlan) {
              throw new Error("Workout plan not found");
            }

            return workoutPlan;
          },
        }),
        createWorkoutPlan: tool({
          description: "Create a new workout plan",
          inputSchema: z.object({
            name: z.string().trim().min(1, { message: "Nome é obrigatório" }),
            workoutDays: z
              .array(
                z.object({
                  name: z
                    .string()
                    .trim()
                    .min(1, { message: "Nome é obrigatório" }),
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
                      order: z
                        .number()
                        .int()
                        .min(0, { message: "Ordem é obrigatória" }),
                      name: z
                        .string()
                        .trim()
                        .min(1, { message: "Nome é obrigatório" }),
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
                        .positive({
                          message: "Tempo de descanso é obrigatório",
                        }),
                    }),
                  ),
                }),
              )
              .describe(
                "Array com exatamente 7 dias de treino (Monday to Sunday)",
              ),
          }),
          execute: async (input) => {
            const session = await auth.api.getSession({
              headers: fromNodeHeaders(request.headers),
            });

            if (!session) {
              throw new Error("Unauthorized");
            }

            const workoutPlanRepository = new PrismaWorkoutPlanRepository(
              prisma,
            );
            const createWorkoutPlan = new CreateWorkoutPlan(
              workoutPlanRepository,
            );

            const workoutPlan = await createWorkoutPlan.execute({
              userId: session.user.id,
              name: input.name,
              workoutDays: input.workoutDays,
            });

            return workoutPlan;
          },
        }),
      },
      stopWhen: stepCountIs(5),
      messages: await convertToModelMessages(messages),
    });

    const response = result.toUIMessageStreamResponse();
    reply.status(response.status);
    response.headers.forEach((value, key) => reply.header(key, value));
    return reply.send(response.body);
  });
};
