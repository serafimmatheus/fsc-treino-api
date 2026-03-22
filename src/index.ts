import "dotenv/config";

import Fastify, { FastifyReply, FastifyRequest } from "fastify";

const fastify = Fastify({
  logger: true,
});

fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
  return reply.status(200).send({ message: "Hello World" });
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
