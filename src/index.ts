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

import { auth } from "./lib/auth.js";

const fastify = Fastify({
  logger: true,
});

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

await fastify.register(fastifySwagger, {
  openapi: {
    info: {
      title: "FSC Treino API",
      description: "API para o sistema de treinos da FSC",
      version: "1.0.0",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Servidor local",
      },
    ],
  },
  transform: jsonSchemaTransform,
});

await fastify.register(fastifyCors, {
  origin: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],
  credentials: true,
});

await fastify.register(fastifyApiReference, {
  routePrefix: "/api",
  configuration: {
    sources: [
      {
        title: "Coach API",
        slug: "coach-api",
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

fastify.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/swagger.json",
  schema: {
    hide: true,
  },
  handler: () => {
    return fastify.swagger();
  },
});

fastify.route({
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
      fastify.log.error(error);
      reply.status(500).send({
        error: "Internal authentication error",
        code: "AUTH_FAILURE",
      });
    }
  },
});

try {
  fastify.listen(
    { port: Number(process.env.PORT) || 3000 },
    (err: Error | null, address: string) => {
      if (err) {
        fastify.log.error(err);
        process.exit(1);
      }
      fastify.log.info(`Server is running on ${address}`);
    },
  );
} catch (error) {
  fastify.log.error(error);
  process.exit(1);
}
