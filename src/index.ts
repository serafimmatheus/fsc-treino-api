import "dotenv/config";

import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import z from "zod";

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

await fastify.register(fastifySwaggerUi, {
  routePrefix: "/api",
});

fastify.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/",
  schema: {
    description: "Hello World",
    tags: ["hello-world"],
    response: {
      200: z.object({
        message: z.string(),
      }),
    },
  },
  handler: () => {
    return { message: "Hello World" };
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
