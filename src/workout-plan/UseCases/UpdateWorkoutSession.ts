import { ErrorForbidden } from "../../errors/ErrorForbidden.js";
import { ErrorNotFound } from "../../errors/ErrorNotFound.js";
import type { IUserWorkoutSessionRepository } from "../Repositories/contracts/IUserWorkoutSessionRepository.js";
import type { IWorkoutPlanRepository } from "../Repositories/contracts/IWorkoutPlanRepository.js";

export interface UpdateWorkoutSessionInput {
  userId: string;
  workoutPlanId: string;
  workoutDayId: string;
  sessionId: string;
  completedAt: string;
}

export interface UpdateWorkoutSessionOutput {
  id: string;
  completedAt: string;
  startedAt: string;
}

export class UpdateWorkoutSession {
  constructor(
    private readonly workoutPlanRepository: IWorkoutPlanRepository,
    private readonly userWorkoutSessionRepository: IUserWorkoutSessionRepository,
  ) {}

  async execute(
    input: UpdateWorkoutSessionInput,
  ): Promise<UpdateWorkoutSessionOutput> {
    const { userId, workoutPlanId, workoutDayId, sessionId, completedAt } =
      input;

    const workoutPlan = await this.workoutPlanRepository.findById(workoutPlanId);
    if (!workoutPlan) {
      throw new ErrorNotFound("Plano de treino não encontrado");
    }

    if (workoutPlan.userId !== userId) {
      throw new ErrorForbidden(
        "Apenas o dono do plano de treino pode atualizar uma sessão",
      );
    }

    const dayExists = workoutPlan.workoutDays.some((wd) => wd.id === workoutDayId);
    if (!dayExists) {
      throw new ErrorNotFound("Dia de treino não encontrado");
    }

    const session =
      await this.userWorkoutSessionRepository.findById(sessionId);
    if (!session) {
      throw new ErrorNotFound("Sessão de treino não encontrada");
    }

    if (session.workoutDayId !== workoutDayId) {
      throw new ErrorNotFound("Sessão de treino não encontrada");
    }

    if (session.userId !== userId) {
      throw new ErrorForbidden(
        "Apenas o dono do plano de treino pode atualizar uma sessão",
      );
    }

    const completedAtDate = new Date(completedAt);
    const result = await this.userWorkoutSessionRepository.updateCompletedAt(
      sessionId,
      completedAtDate,
    );

    return {
      id: result.id,
      completedAt: result.completedAt.toISOString(),
      startedAt: result.startedAt.toISOString(),
    };
  }
}
