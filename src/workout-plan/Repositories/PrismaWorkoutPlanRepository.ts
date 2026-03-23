import type { PrismaClient } from "../../generated/prisma/client.js";
import type {
  CreateWorkoutPlanRepositoryData,
  IWorkoutPlanRepository,
  WorkoutPlanActiveWithDetails,
  WorkoutPlanById,
  WorkoutPlanWithDaysSummary,
  WorkoutPlanWithRelations,
} from "./contracts/IWorkoutPlanRepository.js";

export class PrismaWorkoutPlanRepository implements IWorkoutPlanRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findActiveByUserId(
    userId: string,
  ): Promise<WorkoutPlanActiveWithDetails | null> {
    const result = await this.prisma.workoutPlan.findFirst({
      where: { userId, isActive: true },
      include: {
        workoutDays: {
          include: {
            workoutExercises: true,
          },
        },
      },
    });
    if (!result) return null;
    return {
      id: result.id,
      name: result.name,
      workoutDays: result.workoutDays.map((wd) => ({
        id: wd.id,
        name: wd.name,
        isRest: wd.isRest,
        weekDay: wd.weekDay,
        coverImageUrl: wd.coverImageUrl,
        estimatedDurationInSeconds: wd.estimatedDurationInSeconds,
        workoutExercises: wd.workoutExercises.map((ex) => ({
          order: ex.order,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          restTimeInSeconds: ex.restTimeInSeconds,
        })),
      })),
    };
  }

  async findByIdWithDaysSummary(
    id: string,
  ): Promise<WorkoutPlanWithDaysSummary | null> {
    const result = await this.prisma.workoutPlan.findUnique({
      where: { id },
      include: {
        workoutDays: {
          include: {
            _count: {
              select: { workoutExercises: true },
            },
          },
        },
      },
    });
    if (!result) return null;
    return {
      id: result.id,
      name: result.name,
      userId: result.userId,
      workoutDays: result.workoutDays.map((wd) => ({
        id: wd.id,
        weekDay: wd.weekDay,
        name: wd.name,
        isRest: wd.isRest,
        coverImageUrl: wd.coverImageUrl,
        estimatedDurationInSeconds: wd.estimatedDurationInSeconds,
        exercisesCount: wd._count.workoutExercises,
      })),
    };
  }

  async findById(id: string): Promise<WorkoutPlanById | null> {
    const result = await this.prisma.workoutPlan.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        workoutDays: { select: { id: true } },
      },
    });
    if (!result) return null;
    return {
      id: result.id,
      userId: result.userId,
      workoutDays: result.workoutDays.map((wd) => ({ id: wd.id })),
    };
  }

  async createReplacingActive(
    userId: string,
    data: Omit<CreateWorkoutPlanRepositoryData, "userId">,
  ): Promise<WorkoutPlanWithRelations> {
    const result = await this.prisma.$transaction(async (tx) => {
      const existingWorkoutPlan = await tx.workoutPlan.findFirst({
        where: { userId, isActive: true },
      });

      if (existingWorkoutPlan) {
        await tx.workoutPlan.update({
          where: { id: existingWorkoutPlan.id },
          data: { isActive: false },
        });
      }

      const workoutPlan = await tx.workoutPlan.create({
        data: {
          name: data.name,
          userId,
          workoutDays: {
            create: data.workoutDays.map((wd) => ({
              name: wd.name,
              weekDay: wd.weekDay,
              isRest: wd.isRest,
              coverImageUrl: wd.coverImageUrl ?? null,
              estimatedDurationInSeconds: wd.estimatedDurationInSeconds,
              workoutExercises: {
                create: wd.exercises.map((ex) => ({
                  order: ex.order,
                  name: ex.name,
                  sets: ex.sets,
                  reps: ex.reps,
                  restTimeInSeconds: ex.restTimeInSeconds,
                })),
              },
            })),
          },
        },
      });

      const found = await tx.workoutPlan.findUnique({
        where: { id: workoutPlan.id },
        include: {
          workoutDays: {
            include: {
              workoutExercises: true,
            },
          },
        },
      });

      return found;
    });

    if (!result) {
      throw new Error("Plano de treino não encontrado após criação");
    }

    return {
      id: result.id,
      name: result.name,
      workoutDays: result.workoutDays.map((wd) => ({
        id: wd.id,
        name: wd.name,
        weekDay: wd.weekDay,
        coverImageUrl:
          "coverImageUrl" in wd ? (wd.coverImageUrl as string | null) : null,
        estimatedDurationInSeconds: wd.estimatedDurationInSeconds,
        workoutExercises: wd.workoutExercises.map((ex) => ({
          order: ex.order,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          restTimeInSeconds: ex.restTimeInSeconds,
        })),
      })),
    };
  }
}
