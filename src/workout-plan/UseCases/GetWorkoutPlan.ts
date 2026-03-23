import { ErrorForbidden } from "../../errors/ErrorForbidden.js";
import { ErrorNotFound } from "../../errors/ErrorNotFound.js";
import type { WeekDay } from "../../generated/prisma/enums.js";
import type { IWorkoutPlanRepository } from "../Repositories/contracts/IWorkoutPlanRepository.js";

export interface GetWorkoutPlanInput {
  userId: string;
  workoutPlanId: string;
}

export interface GetWorkoutPlanOutput {
  id: string;
  name: string;
  workoutDays: Array<{
    id: string;
    weekDay: WeekDay;
    name: string;
    isRest: boolean;
    coverImageUrl?: string;
    estimatedDurationInSeconds: number;
    exercisesCount: number;
  }>;
}

export class GetWorkoutPlan {
  constructor(private readonly workoutPlanRepository: IWorkoutPlanRepository) {}

  async execute(input: GetWorkoutPlanInput): Promise<GetWorkoutPlanOutput> {
    const { userId, workoutPlanId } = input;

    const plan =
      await this.workoutPlanRepository.findByIdWithDaysSummary(workoutPlanId);
    if (!plan) {
      throw new ErrorNotFound("Plano de treino não encontrado");
    }

    if (plan.userId !== userId) {
      throw new ErrorForbidden(
        "Apenas o dono do plano de treino pode acessá-lo",
      );
    }

    return {
      id: plan.id,
      name: plan.name,
      workoutDays: plan.workoutDays.map((wd) => ({
        id: wd.id,
        weekDay: wd.weekDay,
        name: wd.name,
        isRest: wd.isRest,
        coverImageUrl: wd.coverImageUrl ?? undefined,
        estimatedDurationInSeconds: wd.estimatedDurationInSeconds,
        exercisesCount: wd.exercisesCount,
      })),
    };
  }
}
