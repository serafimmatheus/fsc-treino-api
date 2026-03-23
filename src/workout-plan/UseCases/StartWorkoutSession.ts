import { ErrorConflict } from "../../errors/ErrorConflict.js";
import { ErrorForbidden } from "../../errors/ErrorForbidden.js";
import { ErrorNotFound } from "../../errors/ErrorNotFound.js";
import type { IUserWorkoutSessionRepository } from "../Repositories/contracts/IUserWorkoutSessionRepository.js";
import type { IWorkoutPlanRepository } from "../Repositories/contracts/IWorkoutPlanRepository.js";

export interface StartWorkoutSessionInput {
  userId: string;
  workoutPlanId: string;
  workoutDayId: string;
}

export interface StartWorkoutSessionOutput {
  userWorkoutSessionId: string;
}

export class StartWorkoutSession {
  constructor(
    private readonly workoutPlanRepository: IWorkoutPlanRepository,
    private readonly userWorkoutSessionRepository: IUserWorkoutSessionRepository,
  ) {}

  async execute(input: StartWorkoutSessionInput): Promise<StartWorkoutSessionOutput> {
    const { userId, workoutPlanId, workoutDayId } = input;

    const workoutPlan = await this.workoutPlanRepository.findById(workoutPlanId);
    if (!workoutPlan) {
      throw new ErrorNotFound("Plano de treino não encontrado");
    }

    if (workoutPlan.userId !== userId) {
      throw new ErrorForbidden("Apenas o dono do plano de treino pode iniciar uma sessão");
    }

    const dayExists = workoutPlan.workoutDays.some((wd) => wd.id === workoutDayId);
    if (!dayExists) {
      throw new ErrorNotFound("Dia de treino não encontrado");
    }

    const activeSession =
      await this.userWorkoutSessionRepository.findActiveByUserId(userId);
    if (activeSession) {
      throw new ErrorConflict(
        "Você já possui uma sessão de treino ativa. Finalize-a antes de iniciar outra.",
      );
    }

    const completedSession =
      await this.userWorkoutSessionRepository.findCompletedByUserIdAndWorkoutDayId(
        userId,
        workoutDayId,
      );
    if (completedSession) {
      throw new ErrorConflict(
        "Este dia de treino já foi concluído. Não é possível iniciar novamente.",
      );
    }

    const { id } = await this.userWorkoutSessionRepository.create(
      userId,
      workoutDayId,
    );

    return { userWorkoutSessionId: id };
  }
}
