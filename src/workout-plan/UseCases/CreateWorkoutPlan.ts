import type { WeekDay } from "../../generated/prisma/enums.js";
import type {
  CreateWorkoutPlanRepositoryData,
  IWorkoutPlanRepository,
} from "../Repositories/contracts/IWorkoutPlanRepository.js";

export interface CreateWorkoutPlanDataInput {
  userId: string;
  name: string;
  workoutDays: WorkoutDayData[];
}

interface WorkoutDayData {
  name: string;
  weekDay: WeekDay;
  isRest: boolean;
  coverImageUrl?: string;
  estimatedDurationInSeconds: number;
  exercises: ExerciseData[];
}

interface ExerciseData {
  order: number;
  name: string;
  sets: number;
  reps: number;
  restTimeInSeconds: number;
}

export class CreateWorkoutPlan {
  constructor(
    private readonly workoutPlanRepository: IWorkoutPlanRepository,
  ) {}

  async execute(dto: CreateWorkoutPlanDataInput) {
    const data: CreateWorkoutPlanRepositoryData = {
      userId: dto.userId,
      name: dto.name,
      workoutDays: dto.workoutDays.map((wd) => ({
        name: wd.name,
        weekDay: wd.weekDay,
        isRest: wd.isRest,
        coverImageUrl: wd.coverImageUrl,
        estimatedDurationInSeconds: wd.estimatedDurationInSeconds,
        exercises: wd.exercises.map((ex) => ({
          order: ex.order,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          restTimeInSeconds: ex.restTimeInSeconds,
        })),
      })),
    };

    return this.workoutPlanRepository.createReplacingActive(dto.userId, data);
  }
}
