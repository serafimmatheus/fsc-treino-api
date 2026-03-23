import { ErrorForbidden } from "../../errors/ErrorForbidden.js";
import { ErrorNotFound } from "../../errors/ErrorNotFound.js";
import type { WeekDay } from "../../generated/prisma/enums.js";
import type { IWorkoutPlanRepository } from "../Repositories/contracts/IWorkoutPlanRepository.js";

export interface GetWorkoutDayInput {
  userId: string;
  workoutPlanId: string;
  workoutDayId: string;
}

export interface GetWorkoutDayOutput {
  id: string;
  name: string;
  isRest: boolean;
  coverImageUrl?: string;
  estimatedDurationInSeconds: number;
  exercises: Array<{
    id: string;
    order: number;
    name: string;
    sets: number;
    reps: number;
    restTimeInSeconds: number;
    workoutDayId: string;
  }>;
  weekDay: WeekDay;
  sessions: Array<{
    id: string;
    workoutDayId: string;
    startedAt?: string;
    completedAt?: string;
  }>;
}

function formatDateToYYYYMMDD(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

export class GetWorkoutDay {
  constructor(private readonly workoutPlanRepository: IWorkoutPlanRepository) {}

  async execute(input: GetWorkoutDayInput): Promise<GetWorkoutDayOutput> {
    const { userId, workoutPlanId, workoutDayId } = input;

    const workoutPlan =
      await this.workoutPlanRepository.findById(workoutPlanId);
    if (!workoutPlan) {
      throw new ErrorNotFound("Plano de treino não encontrado");
    }

    if (workoutPlan.userId !== userId) {
      throw new ErrorForbidden(
        "Apenas o dono do plano de treino pode acessá-lo",
      );
    }

    const dayExists = workoutPlan.workoutDays.some((wd) => wd.id === workoutDayId);
    if (!dayExists) {
      throw new ErrorNotFound("Dia de treino não encontrado");
    }

    const day =
      await this.workoutPlanRepository.findWorkoutDayByIdWithDetails(
        workoutDayId,
        userId,
      );
    if (!day) {
      throw new ErrorNotFound("Dia de treino não encontrado");
    }

    return {
      id: day.id,
      name: day.name,
      isRest: day.isRest,
      coverImageUrl: day.coverImageUrl ?? undefined,
      estimatedDurationInSeconds: day.estimatedDurationInSeconds,
      exercises: day.workoutExercises,
      weekDay: day.weekDay,
      sessions: day.userWorkoutSessions.map((s) => ({
        id: s.id,
        workoutDayId: s.workoutDayId,
        startedAt: formatDateToYYYYMMDD(s.startedAt),
        completedAt: s.completedAt
          ? formatDateToYYYYMMDD(s.completedAt)
          : undefined,
      })),
    };
  }
}
