import "dotenv/config";

import fastifyCors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import fastifyApiReference from "@scalar/fastify-api-reference";
import Fastify from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";

import { homeRoutes } from "./home/Routes/home.js";
import { GetHomeData } from "./home/UseCases/GetHomeData.js";
import { iaRoutes } from "./IA/routes/ia.js";
import { auth } from "./lib/auth.js";
import { prisma } from "./lib/db.js";
import { statsRoutes } from "./stats/routes/stats.js";
import { GetStats } from "./stats/UseCases/GetStats.js";
import { PrismaUserTrainDataRepository } from "./user-train-data/Repositories/PrismaUserTrainDataRepository.js";
import { userTrainDataRoutes } from "./user-train-data/Routes/user-train-data.js";
import { GetUserTrainData } from "./user-train-data/UseCases/GetUserTrainData.js";
import { UpsertUserTrainData } from "./user-train-data/UseCases/UpsertUserTrainData.js";
import { PrismaUserWorkoutSessionRepository } from "./workout-plan/Repositories/PrismaUserWorkoutSessionRepository.js";
import { PrismaWorkoutPlanRepository } from "./workout-plan/Repositories/PrismaWorkoutPlanRepository.js";
import { workoutPlanRoutes } from "./workout-plan/Routes/workout-plan.js";
import { CreateWorkoutPlan } from "./workout-plan/UseCases/CreateWorkoutPlan.js";
import { GetWorkoutDay } from "./workout-plan/UseCases/GetWorkoutDay.js";
import { GetWorkoutPlan } from "./workout-plan/UseCases/GetWorkoutPlan.js";
import { ListWorkoutPlans } from "./workout-plan/UseCases/ListWorkoutPlans.js";
import { StartWorkoutSession } from "./workout-plan/UseCases/StartWorkoutSession.js";
import { UpdateWorkoutSession } from "./workout-plan/UseCases/UpdateWorkoutSession.js";

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

// DI container - Repositories & UseCases
const workoutPlanRepository = new PrismaWorkoutPlanRepository(prisma);
const userWorkoutSessionRepository = new PrismaUserWorkoutSessionRepository(
  prisma,
);
const createWorkoutPlan = new CreateWorkoutPlan(workoutPlanRepository);
const getWorkoutDay = new GetWorkoutDay(workoutPlanRepository);
const getWorkoutPlan = new GetWorkoutPlan(workoutPlanRepository);
const listWorkoutPlans = new ListWorkoutPlans(workoutPlanRepository);
const startWorkoutSession = new StartWorkoutSession(
  workoutPlanRepository,
  userWorkoutSessionRepository,
);
const updateWorkoutSession = new UpdateWorkoutSession(
  workoutPlanRepository,
  userWorkoutSessionRepository,
);
const getHomeData = new GetHomeData(
  workoutPlanRepository,
  userWorkoutSessionRepository,
);
const getStats = new GetStats(
  workoutPlanRepository,
  userWorkoutSessionRepository,
);
const userTrainDataRepository = new PrismaUserTrainDataRepository(prisma);
const getUserTrainData = new GetUserTrainData(userTrainDataRepository);
const upsertUserTrainData = new UpsertUserTrainData(userTrainDataRepository);

// Routes
await app.register(homeRoutes, {
  prefix: "/home",
  getHomeData,
});
await app.register(workoutPlanRoutes, {
  prefix: "/workout-plans",
  createWorkoutPlan,
  getWorkoutDay,
  getWorkoutPlan,
  listWorkoutPlans,
  startWorkoutSession,
  updateWorkoutSession,
});
await app.register(statsRoutes, {
  prefix: "/stats",
  getStats,
});
await app.register(userTrainDataRoutes, {
  prefix: "",
  getUserTrainData,
});
await app.register(iaRoutes, {
  prefix: "/ia",
  getUserTrainData,
  upsertUserTrainData,
  listWorkoutPlans,
  createWorkoutPlan,
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

try {
  await app.listen({ port: Number(process.env.PORT) || 3000 });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
