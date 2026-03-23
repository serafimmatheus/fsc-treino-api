import type { PrismaClient } from "../../generated/prisma/client.js";
import type {
  IUserTrainDataRepository,
  UpsertUserTrainDataRepositoryData,
  UserTrainDataWithUser,
} from "./contracts/IUserTrainDataRepository.js";

export class PrismaUserTrainDataRepository implements IUserTrainDataRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsert(
    userId: string,
    data: UpsertUserTrainDataRepositoryData,
  ): Promise<UpsertUserTrainDataRepositoryData & { userId: string }> {
    const bodyFatPercentageDb = Math.round(data.bodyFatPercentage * 100);

    const result = await this.prisma.userTrainData.upsert({
      where: { userId },
      create: {
        userId,
        weightInGrams: data.weightInGrams,
        heightInCentimeters: data.heightInCentimeters,
        age: data.age,
        bodyFatPercentage: bodyFatPercentageDb,
      },
      update: {
        weightInGrams: data.weightInGrams,
        heightInCentimeters: data.heightInCentimeters,
        age: data.age,
        bodyFatPercentage: bodyFatPercentageDb,
      },
    });

    return {
      userId: result.userId,
      weightInGrams: result.weightInGrams,
      heightInCentimeters: result.heightInCentimeters,
      age: result.age,
      bodyFatPercentage: result.bodyFatPercentage / 100,
    };
  }

  async findByUserId(userId: string): Promise<UserTrainDataWithUser | null> {
    const result = await this.prisma.userTrainData.findUnique({
      where: { userId },
      include: { user: { select: { name: true } } },
    });

    if (!result) return null;

    return {
      userId: result.userId,
      userName: result.user.name,
      weightInGrams: result.weightInGrams,
      heightInCentimeters: result.heightInCentimeters,
      age: result.age,
      bodyFatPercentage: result.bodyFatPercentage / 100,
    };
  }
}
