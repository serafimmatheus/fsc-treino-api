import type { PrismaClient } from "../../generated/prisma/client.js";
import type {
  IUserWorkoutSessionRepository,
  UserWorkoutSessionById,
} from "./contracts/IUserWorkoutSessionRepository.js";

export class PrismaUserWorkoutSessionRepository
  implements IUserWorkoutSessionRepository
{
  constructor(private readonly prisma: PrismaClient) {}

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
}
