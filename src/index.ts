import "dotenv/config";

import fastifyCors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import fastifyApiReference from "@scalar/fastify-api-reference";
import { fromNodeHeaders } from "better-auth/node";
import Fastify from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import z from "zod";

import { ErrorNotFound } from "./errors/ErrorNotFound.js";
import { WeekDay } from "./generated/prisma/enums.js";
import { auth } from "./lib/auth.js";
import { CreateWorkoutPlan } from "./UseCases/CreateWorkoutPlan.js";

const app = Fastify({
  logger: true,
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

await app.register(fastifySwagger, {
  openapi: {
    info: {
      title: "Bootcamp Treinos API",
      description: "API para o bootcamp de treinos do FSC",
      version: "1.0.0",
    },
    servers: [
      {
        description: "Localhost",
        url: `http://localhost:${process.env.PORT || 3000}`,
      },
    ],
  },
  transform: jsonSchemaTransform,
});

await app.register(fastifyCors, {
  origin: ["http://localhost:3000"],
  credentials: true,
});

await app.register(fastifyApiReference, {
  routePrefix: "/api",
  configuration: {
    sources: [
      {
        title: "Bootcamp Treinos API",
        slug: "bootcamp-treinos-api",
        url: "/swagger.json",
      },
      {
        title: "Auth API",
        slug: "auth-api",
        url: "/api/auth/open-api/generate-schema",
      },
    ],
  },
});

app.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/swagger.json",
  schema: {
    hide: true,
  },
  handler: async () => {
    return app.swagger();
  },
});

app.route({
  method: ["GET", "POST"],
  url: "/api/auth/*",
  async handler(request, reply) {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);

      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) headers.append(key, value.toString());
      });
      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
      });
      const response = await auth.handler(req);
      reply.status(response.status);
      response.headers.forEach((value, key) => reply.header(key, value));
      reply.send(response.body ? await response.text() : null);
    } catch (error) {
      app.log.error(error);
      reply.status(500).send({
        error: "Internal authentication error",
        code: "AUTH_FAILURE",
      });
    }
  },
});

app.withTypeProvider<ZodTypeProvider>().route({
  method: "POST",
  url: "/workout-plans",
  schema: {
    body: z.object({
      name: z.string().trim().min(1, { message: "Nome é obrigatório" }),
      workoutDays: z.array(
        z.object({
          name: z.string().trim().min(1, { message: "Nome é obrigatório" }),
          weekDay: z.enum(WeekDay),
          isRest: z.boolean().default(false),
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
    }),
    response: {
      201: z.object({
        id: z.string().cuid(),
        name: z.string().trim().min(1, { message: "Nome é obrigatório" }),
        workoutDays: z.array(
          z.object({
            name: z.string().trim().min(1, { message: "Nome é obrigatório" }),
            weekDay: z.enum(WeekDay),
            isRest: z.boolean().default(false),
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
                  .positive({ message: "Tempo de descanso é obrigatório" }),
              }),
            ),
          }),
        ),
      }),
      401: z.object({
        message: z.string(),
        code: z.string(),
      }),
      400: z.object({
        message: z.string(),
        code: z.string(),
      }),
      404: z.object({
        message: z.string(),
        code: z.string(),
      }),
      500: z.object({
        message: z.string(),
        code: z.string(),
      }),
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
      const createWorkoutPlan = new CreateWorkoutPlan();
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

try {
  await app.listen({ port: Number(process.env.PORT) || 3000 });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
