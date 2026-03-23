import { fromNodeHeaders } from "better-auth/node";
import type { FastifyPluginAsync } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { auth } from "../../lib/auth.js";
import { ErrorSchema } from "../../schemas/ErrorSchema.js";
import { GetStatsQuerySchema, GetStatsResponseSchema } from "../schemas.js";
import type { GetStats } from "../UseCases/GetStats.js";

interface StatsRoutesOptions {
  getStats: GetStats;
}

export const statsRoutes: FastifyPluginAsync<StatsRoutesOptions> = async (
  app,
  opts,
) => {
  const { getStats } = opts;

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/",
    schema: {
      operationId: "getStats",
      tags: ["Stats"],
      summary: "Get user statistics",
      description:
        "Returns workout statistics for the authenticated user within the specified date range",
      querystring: GetStatsQuerySchema,
      response: {
        200: GetStatsResponseSchema,
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

        const { from, to } = request.query;
        const result = await getStats.execute({
          userId: session.user.id,
          from,
          to,
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
