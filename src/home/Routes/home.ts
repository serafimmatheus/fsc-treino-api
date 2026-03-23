import { fromNodeHeaders } from "better-auth/node";
import type { FastifyPluginAsync } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { auth } from "../../lib/auth.js";
import { ErrorSchema } from "../../schemas/ErrorSchema.js";
import {
  GetHomeParamsSchema,
  GetHomeResponseSchema,
} from "../schemas.js";
import type { GetHomeData } from "../UseCases/GetHomeData.js";

interface HomeRoutesOptions {
  getHomeData: GetHomeData;
}

export const homeRoutes: FastifyPluginAsync<HomeRoutesOptions> = async (
  app,
  opts,
) => {
  const { getHomeData } = opts;

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/:date",
    schema: {
      tags: ["Home"],
      summary: "Get home page data",
      description:
        "Returns the data needed to fill the home page for the authenticated user",
      params: GetHomeParamsSchema,
      response: {
        200: GetHomeResponseSchema,
        401: ErrorSchema,
        400: ErrorSchema,
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

        const { date } = request.params;
        const result = await getHomeData.execute({
          userId: session.user.id,
          date,
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
