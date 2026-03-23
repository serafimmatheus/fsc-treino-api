import { fromNodeHeaders } from "better-auth/node";
import type { FastifyPluginAsync } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { ErrorConflict } from "../../errors/ErrorConflict.js";
import { ErrorForbidden } from "../../errors/ErrorForbidden.js";
import { ErrorNotFound } from "../../errors/ErrorNotFound.js";
import { auth } from "../../lib/auth.js";
import {
  ErrorSchema,
  GetWorkoutDayParamsSchema,
  GetWorkoutDayResponseSchema,
  GetWorkoutPlanParamsSchema,
  GetWorkoutPlanResponseSchema,
  ListWorkoutPlansQuerySchema,
  ListWorkoutPlansResponseSchema,
  StartWorkoutSessionParamsSchema,
  StartWorkoutSessionResponseSchema,
  UpdateWorkoutSessionBodySchema,
  UpdateWorkoutSessionParamsSchema,
  UpdateWorkoutSessionResponseSchema,
  WorkoutPlanSchema,
} from "../../schemas/ErrorSchema.js";
import type { CreateWorkoutPlan } from "../UseCases/CreateWorkoutPlan.js";
import type { GetWorkoutDay } from "../UseCases/GetWorkoutDay.js";
import type { GetWorkoutPlan } from "../UseCases/GetWorkoutPlan.js";
import type { ListWorkoutPlans } from "../UseCases/ListWorkoutPlans.js";
import type { StartWorkoutSession } from "../UseCases/StartWorkoutSession.js";
import type { UpdateWorkoutSession } from "../UseCases/UpdateWorkoutSession.js";

interface WorkoutPlanRoutesOptions {
  createWorkoutPlan: CreateWorkoutPlan;
  getWorkoutDay: GetWorkoutDay;
  getWorkoutPlan: GetWorkoutPlan;
  listWorkoutPlans: ListWorkoutPlans;
  startWorkoutSession: StartWorkoutSession;
  updateWorkoutSession: UpdateWorkoutSession;
}

export const workoutPlanRoutes: FastifyPluginAsync<
  WorkoutPlanRoutesOptions
> = async (app, opts) => {
  const {
    createWorkoutPlan,
    getWorkoutDay,
    getWorkoutPlan,
    listWorkoutPlans,
    startWorkoutSession,
    updateWorkoutSession,
  } = opts;

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/",
    schema: {
      tags: ["Workout Plan"],
      summary: "List workout plans",
      description:
        "Lista os planos de treino do usuário. Filtro active opcional: ?active=true (apenas ativos), ?active=false (apenas inativos). Sem o filtro, retorna todos.",
      querystring: ListWorkoutPlansQuerySchema,
      response: {
        200: ListWorkoutPlansResponseSchema,
        401: ErrorSchema,
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

        const { active } = request.query;
        const result = await listWorkoutPlans.execute({
          userId: session.user.id,
          active,
        });

        return reply.status(200).send(result);
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({
          message: "Internal server error",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/:id",
    schema: {
      tags: ["Workout Plan"],
      summary: "Get workout plan by ID",
      description: "Retorna o plano de treino com seus dias (exercisesCount)",
      params: GetWorkoutPlanParamsSchema,
      response: {
        200: GetWorkoutPlanResponseSchema,
        401: ErrorSchema,
        403: ErrorSchema,
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

        const { id } = request.params;
        const result = await getWorkoutPlan.execute({
          userId: session.user.id,
          workoutPlanId: id,
        });

        return reply.status(200).send(result);
      } catch (error) {
        app.log.error(error);
        if (error instanceof ErrorNotFound) {
          return reply.status(404).send({
            message: error.message,
            code: error.name.toUpperCase(),
          });
        }
        if (error instanceof ErrorForbidden) {
          return reply.status(403).send({
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

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/:workoutPlanId/days/:workoutDayId",
    schema: {
      tags: ["Workout Plan"],
      summary: "Get workout day by ID",
      description:
        "Retorna o dia de treino com seus exercícios e sessões do usuário",
      params: GetWorkoutDayParamsSchema,
      response: {
        200: GetWorkoutDayResponseSchema,
        401: ErrorSchema,
        403: ErrorSchema,
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

        const { workoutPlanId, workoutDayId } = request.params;
        const result = await getWorkoutDay.execute({
          userId: session.user.id,
          workoutPlanId,
          workoutDayId,
        });

        return reply.status(200).send(result);
      } catch (error) {
        app.log.error(error);
        if (error instanceof ErrorNotFound) {
          return reply.status(404).send({
            message: error.message,
            code: error.name.toUpperCase(),
          });
        }
        if (error instanceof ErrorForbidden) {
          return reply.status(403).send({
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

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    schema: {
      tags: ["Workout Plan"],
      summary: "Create a new workout plan",
      description: "Create a new workout plan",
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
            coverImageUrl: workoutDay.coverImageUrl ?? undefined,
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

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/:workoutPlanId/days/:workoutDayId/sessions",
    schema: {
      tags: ["Workout Plan"],
      summary: "Start a workout session",
      description: "Start a workout session",
      params: StartWorkoutSessionParamsSchema,
      response: {
        201: StartWorkoutSessionResponseSchema,
        401: ErrorSchema,
        403: ErrorSchema,
        404: ErrorSchema,
        409: ErrorSchema,
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

        const { workoutPlanId, workoutDayId } = request.params;
        const result = await startWorkoutSession.execute({
          userId: session.user.id,
          workoutPlanId,
          workoutDayId,
        });

        return reply.status(201).send({
          userWorkoutSessionId: result.userWorkoutSessionId,
        });
      } catch (error) {
        app.log.error(error);
        if (error instanceof ErrorNotFound) {
          return reply.status(404).send({
            message: error.message,
            code: error.name.toUpperCase(),
          });
        }
        if (error instanceof ErrorForbidden) {
          return reply.status(403).send({
            message: error.message,
            code: error.name.toUpperCase(),
          });
        }
        if (error instanceof ErrorConflict) {
          return reply.status(409).send({
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

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "PATCH",
    url: "/:workoutPlanId/days/:workoutDayId/sessions/:sessionId",
    schema: {
      tags: ["Workout Plan"],
      summary: "Update a workout session",
      description: "Atualiza uma sessão de treino específica",
      params: UpdateWorkoutSessionParamsSchema,
      body: UpdateWorkoutSessionBodySchema,
      response: {
        200: UpdateWorkoutSessionResponseSchema,
        401: ErrorSchema,
        403: ErrorSchema,
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

        const { workoutPlanId, workoutDayId, sessionId } = request.params;
        const { completedAt } = request.body;
        const result = await updateWorkoutSession.execute({
          userId: session.user.id,
          workoutPlanId,
          workoutDayId,
          sessionId,
          completedAt,
        });

        return reply.status(200).send(result);
      } catch (error) {
        app.log.error(error);
        if (error instanceof ErrorNotFound) {
          return reply.status(404).send({
            message: error.message,
            code: error.name.toUpperCase(),
          });
        }
        if (error instanceof ErrorForbidden) {
          return reply.status(403).send({
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
