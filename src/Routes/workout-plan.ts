import { fromNodeHeaders } from "better-auth/node";
import type { FastifyPluginAsync } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { ErrorNotFound } from "../errors/ErrorNotFound.js";
import { auth } from "../lib/auth.js";
import { ErrorSchema, WorkoutPlanSchema } from "../schemas/ErrorSchema.js";
import type { CreateWorkoutPlan } from "../UseCases/CreateWorkoutPlan.js";

interface WorkoutPlanRoutesOptions {
  createWorkoutPlan: CreateWorkoutPlan;
}

export const workoutPlanRoutes: FastifyPluginAsync<WorkoutPlanRoutesOptions> =
  async (app, opts) => {
    const { createWorkoutPlan } = opts;

    app.withTypeProvider<ZodTypeProvider>().route({
      method: "POST",
      url: "/",
      schema: {
        body: WorkoutPlanSchema.omit({ id: true }),
        response: {
          201: WorkoutPlanSchema,
          401: ErrorSchema,
          400: ErrorSchema,
          404: ErrorSchema,
          500: ErrorSchema,
        },
      },
      handler: async (request, reply) => {
        try {
          const session = await auth.api.getSession({
            headers: fromNodeHeaders(request.headers),
          });

          if (!session) {
            return reply.status(401).send({
              message: "Unauthorized",
              code: "UNAUTHORIZED",
            });
          }

          const { name, workoutDays } = request.body;
          const result = await createWorkoutPlan.execute({
            userId: session.user.id,
            name,
            workoutDays,
          });

          return reply.status(201).send({
            id: result.id,
            name: result.name,
            workoutDays: result.workoutDays.map((workoutDay) => ({
              id: workoutDay.id,
              name: workoutDay.name,
              weekDay: workoutDay.weekDay,
              estimatedDurationInSeconds: workoutDay.estimatedDurationInSeconds,
              exercises: workoutDay.workoutExercises.map((exercise) => ({
                order: exercise.order,
                name: exercise.name,
                sets: exercise.sets,
                reps: exercise.reps,
                restTimeInSeconds: exercise.restTimeInSeconds,
              })),
            })),
          });
        } catch (error) {
          app.log.error(error);
          if (error instanceof ErrorNotFound) {
            return reply.status(404).send({
              message: error.message,
              code: error.name.toUpperCase(),
            });
          }
          return reply.status(500).send({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
          });
        }
      },
    });
  };
