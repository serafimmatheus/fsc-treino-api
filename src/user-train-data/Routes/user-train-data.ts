import { fromNodeHeaders } from "better-auth/node";
import type { FastifyPluginAsync } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { auth } from "../../lib/auth.js";
import { ErrorSchema } from "../../schemas/ErrorSchema.js";
import { GetUserTrainDataResponseSchema } from "../schemas.js";
import type { GetUserTrainData } from "../UseCases/GetUserTrainData.js";

interface UserTrainDataRoutesOptions {
  getUserTrainData: GetUserTrainData;
}

export const userTrainDataRoutes: FastifyPluginAsync<
  UserTrainDataRoutesOptions
> = async (app, opts) => {
  const { getUserTrainData } = opts;

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/me",
    schema: {
      operationId: "getUserTrainData",
      tags: ["Me"],
      summary: "Get current user train data",
      description:
        "Retorna os dados de treino do usuário autenticado. Retorna null (200) se os dados ainda não existirem.",
      response: {
        200: GetUserTrainDataResponseSchema,
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

        const result = await getUserTrainData.execute({
          userId: session.user.id,
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
};
