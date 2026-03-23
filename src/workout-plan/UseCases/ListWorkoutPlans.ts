import type { WeekDay } from "../../generated/prisma/enums.js";
import type { IWorkoutPlanRepository } from "../Repositories/contracts/IWorkoutPlanRepository.js";

export interface ListWorkoutPlansInput {
  userId: string;
  active?: boolean;
}

export interface ListWorkoutPlansOutput {
  workoutPlans: Array<{
    id: string;
    name: string;
    isActive: boolean;
    workoutDays: Array<{
      id: string;
      name: string;
      isRest: boolean;
      weekDay: WeekDay;
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
    }>;
  }>;
}

export class ListWorkoutPlans {
  constructor(private readonly workoutPlanRepository: IWorkoutPlanRepository) {}

  async execute(input: ListWorkoutPlansInput): Promise<ListWorkoutPlansOutput> {
    const { userId, active } = input;

    const workoutPlans = await this.workoutPlanRepository.findManyByUserId(
      userId,
      active,
    );

    return {
      workoutPlans: workoutPlans.map((wp) => ({
        id: wp.id,
        name: wp.name,
        isActive: wp.isActive,
        workoutDays: wp.workoutDays.map((wd) => ({
          id: wd.id,
          name: wd.name,
          isRest: wd.isRest,
          weekDay: wd.weekDay,
          coverImageUrl: wd.coverImageUrl ?? undefined,
          estimatedDurationInSeconds: wd.estimatedDurationInSeconds,
          exercises: wd.workoutExercises,
        })),
      })),
    };
  }
}
