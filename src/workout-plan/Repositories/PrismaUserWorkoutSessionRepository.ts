import type { PrismaClient } from "../../generated/prisma/client.js";
import type {
  IUserWorkoutSessionRepository,
  UserWorkoutSessionById,
  UserWorkoutSessionUpdated,
  UserWorkoutSessionWithDetails,
} from "./contracts/IUserWorkoutSessionRepository.js";

export class PrismaUserWorkoutSessionRepository
  implements IUserWorkoutSessionRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async findActiveByUserId(
    userId: string,
  ): Promise<UserWorkoutSessionById | null> {
    const session = await this.prisma.userWorkoutSession.findFirst({
      where: {
        userId,
        completedAt: null,
      },
      select: { id: true },
    });
    return session;
  }

  async findActiveByWorkoutDayId(
    workoutDayId: string,
  ): Promise<UserWorkoutSessionById | null> {
    const session = await this.prisma.userWorkoutSession.findFirst({
      where: {
        workoutDayId,
        completedAt: null,
      },
      select: { id: true },
    });
    return session;
  }

  async findById(
    sessionId: string,
  ): Promise<UserWorkoutSessionWithDetails | null> {
    const session = await this.prisma.userWorkoutSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        userId: true,
        workoutDayId: true,
        startedAt: true,
        completedAt: true,
      },
    });
    return session;
  }

  async create(userId: string, workoutDayId: string): Promise<{ id: string }> {
    const startedAt = new Date();
    const session = await this.prisma.userWorkoutSession.create({
      data: {
        userId,
        workoutDayId,
        startedAt,
        completedAt: null,
      },
      select: { id: true },
    });
    return { id: session.id };
  }

  async updateCompletedAt(
    sessionId: string,
    completedAt: Date,
  ): Promise<UserWorkoutSessionUpdated> {
    const session = await this.prisma.userWorkoutSession.update({
      where: { id: sessionId },
      data: { completedAt },
      select: { id: true, startedAt: true, completedAt: true },
    });
    return {
      id: session.id,
      startedAt: session.startedAt,
      completedAt: session.completedAt!,
    };
  }
}
