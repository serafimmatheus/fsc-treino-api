import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyPluginAsync } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import { WeekDay } from "../../generated/prisma/enums.js";
import { auth } from "../../lib/auth.js";
import { ErrorSchema } from "../../schemas/ErrorSchema.js";
import type { GetUserTrainData } from "../../user-train-data/UseCases/GetUserTrainData.js";
import type { UpsertUserTrainData } from "../../user-train-data/UseCases/UpsertUserTrainData.js";
import type { CreateWorkoutPlan } from "../../workout-plan/UseCases/CreateWorkoutPlan.js";
import type { ListWorkoutPlans } from "../../workout-plan/UseCases/ListWorkoutPlans.js";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Você é um personal trainer virtual especialista em montagem de planos de treino. Seu tom deve ser amigável, motivador e usar linguagem simples, sem jargões técnicos. O principal público são pessoas leigas em musculação.

## Regras obrigatórias

1. **SEMPRE** chame a tool \`getUserTrainData\` antes de qualquer interação com o usuário.

2. **Se o usuário NÃO tem dados cadastrados** (retornou null):
   - Pergunte em uma única mensagem: nome, peso (kg), altura (cm), idade e % de gordura corporal. Seja simples e direto.
   - Após receber as respostas, salve com \`updateUserTrainData\` (converter peso de kg para gramas: peso * 1000).

3. **Se o usuário JÁ tem dados**: cumprimente pelo nome.

4. **Para criar um plano de treino**: pergunte objetivo, dias disponíveis por semana e restrições físicas/lesões. Poucas perguntas, simples e diretas.

5. **O plano DEVE ter exatamente 7 dias** (MONDAY a SUNDAY). Dias sem treino = \`isRest: true\`, \`exercises: []\`, \`estimatedDurationInSeconds: 0\`. Chame \`createWorkoutPlan\` para criar.

6. **Respostas curtas e objetivas.**

## Divisões (Splits) por dias disponíveis

- **2-3 dias/semana**: Full Body ou ABC (A: Peito+Tríceps, B: Costas+Bíceps, C: Pernas+Ombros)
- **4 dias/semana**: Upper/Lower (recomendado, cada grupo 2x/semana) ou ABCD (A: Peito+Tríceps, B: Costas+Bíceps, C: Pernas, D: Ombros+Abdômen)
- **5 dias/semana**: PPLUL — Push/Pull/Legs + Upper/Lower (superior 3x, inferior 2x/semana)
- **6 dias/semana**: PPL 2x — Push/Pull/Legs repetido

## Princípios de montagem

- Músculos sinérgicos juntos (peito+tríceps, costas+bíceps)
- Exercícios compostos primeiro, isoladores depois
- 4 a 8 exercícios por sessão
- 3-4 séries por exercício. 8-12 reps (hipertrofia), 4-6 reps (força)
- Descanso entre séries: 60-90s (hipertrofia), 2-3min (compostos pesados)
- Evitar treinar o mesmo grupo muscular em dias consecutivos
- Nomes descritivos para cada dia (ex: "Superior A - Peito e Costas", "Descanso")

## Imagens de capa (coverImageUrl)

SEMPRE forneça um \`coverImageUrl\` para cada dia de treino. Alternar entre as opções para variar.

**Dias superiores** (peito, costas, ombros, bíceps, tríceps, push, pull, upper, full body):
- \`https://gw8hy3fdcv.ufs.sh/f/ccoBDpLoAPCO3y8pQ6GBg8iqe9pP2JrHjwd1nfKtVSQskI0v\`
- \`https://gw8hy3fdcv.ufs.sh/f/ccoBDpLoAPCOW3fJmqZe4yoUcwvRPQa8kmFprzNiC30hqftL\`

**Dias inferiores** (pernas, glúteos, quadríceps, posterior, panturrilha, legs, lower):
- \`https://gw8hy3fdcv.ufs.sh/f/ccoBDpLoAPCOgCHaUgNGronCvXmSzAMs1N3KgLdE5yHT6Ykj\`
- \`https://gw8hy3fdcv.ufs.sh/f/ccoBDpLoAPCO85RVu3morROwZk5NPhs1jzH7X8TyEvLUCGxY\`

**Dias de descanso**: use imagem de superior.`;

const workoutDaySchema = z.object({
  name: z.string().trim().min(1, { message: "Nome é obrigatório" }),
  weekDay: z.enum(WeekDay),
  isRest: z.boolean().default(false),
  coverImageUrl: z.string().url(),
  estimatedDurationInSeconds: z.number().int().min(0),
  exercises: z.array(
    z.object({
      order: z.number().int().min(0),
      name: z.string().trim().min(1, { message: "Nome é obrigatório" }),
      sets: z.number().int().min(1).positive(),
      reps: z.number().int().min(1).positive(),
      restTimeInSeconds: z.number().int().min(1).positive(),
    }),
  ),
});

interface IaRoutesOptions {
  getUserTrainData: GetUserTrainData;
  upsertUserTrainData: UpsertUserTrainData;
  listWorkoutPlans: ListWorkoutPlans;
  createWorkoutPlan: CreateWorkoutPlan;
}

export const iaRoutes: FastifyPluginAsync<IaRoutesOptions> = async (
  app,
  opts,
) => {
  const {
    getUserTrainData,
    upsertUserTrainData,
    listWorkoutPlans,
    createWorkoutPlan,
  } = opts;

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    schema: {
      operationId: "chatWithIA",
      tags: ["IA"],
      summary: "Chat com personal trainer virtual",
      body: z.object({
        messages: z.array(z.any()),
      }),
      response: {
        200: { description: "Stream de resposta" },
        401: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });

      if (!session) {
        return reply.status(401).send({
          message: "Unauthorized",
          code: "UNAUTHORIZED",
        });
      }

      const userId = session.user.id;
      const { messages } = request.body as { messages: UIMessage[] };

      const result = streamText({
        model: openai("gpt-4o-mini"),
        system: SYSTEM_PROMPT,
        tools: {
          getUserTrainData: tool({
            description:
              "Busca os dados de treino do usuário. SEMPRE chame antes de interagir.",
            inputSchema: z.object({}),
            execute: async () => {
              return getUserTrainData.execute({ userId });
            },
          }),
          updateUserTrainData: tool({
            description:
              "Salva ou atualiza os dados de treino do usuário (peso em gramas).",
            inputSchema: z.object({
              weightInGrams: z.number().int().min(0),
              heightInCentimeters: z.number().int().min(1),
              age: z.number().int().min(1),
              bodyFatPercentage: z.number().int().min(0).max(100),
            }),
            execute: async (input) => {
              return upsertUserTrainData.execute({
                userId,
                ...input,
              });
            },
          }),
          getWorkoutPlans: tool({
            description: "Lista os planos de treino do usuário.",
            inputSchema: z.object({}),
            execute: async () => {
              return listWorkoutPlans.execute({ userId });
            },
          }),
          createWorkoutPlan: tool({
            description:
              "Cria um novo plano de treino. O plano deve ter exatamente 7 dias (MONDAY a SUNDAY).",
            inputSchema: z.object({
              name: z.string().trim().min(1, { message: "Nome é obrigatório" }),
              workoutDays: z
                .array(workoutDaySchema)
                .length(7)
                .describe(
                  "Array com exatamente 7 dias de treino (Monday a Sunday)",
                ),
            }),
            execute: async (input) => {
              return createWorkoutPlan.execute({
                userId,
                name: input.name,
                workoutDays: input.workoutDays,
              });
            },
          }),
        },
        stopWhen: stepCountIs(5),
        messages: await convertToModelMessages(messages),
      });

      const response = result.toUIMessageStreamResponse();
      reply.status(response.status as 200 | 401 | 500);
      response.headers.forEach((value, key) => reply.header(key, value));
      return reply.send(response.body);
    },
  });
};
