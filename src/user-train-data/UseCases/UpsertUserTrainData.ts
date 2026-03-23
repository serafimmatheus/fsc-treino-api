import type { IUserTrainDataRepository } from "../Repositories/contracts/IUserTrainDataRepository.js";

export interface UpsertUserTrainDataInput {
  userId: string;
  weightInGrams: number;
  heightInCentimeters: number;
  age: number;
  bodyFatPercentage: number; // 1 representa 100%
}

export interface UpsertUserTrainDataOutput {
  userId: string;
  weightInGrams: number;
  heightInCentimeters: number;
  age: number;
  bodyFatPercentage: number;
}

export class UpsertUserTrainData {
  constructor(
    private readonly userTrainDataRepository: IUserTrainDataRepository,
  ) {}

  async execute(
    input: UpsertUserTrainDataInput,
  ): Promise<UpsertUserTrainDataOutput> {
    const result = await this.userTrainDataRepository.upsert(input.userId, {
      weightInGrams: input.weightInGrams,
      heightInCentimeters: input.heightInCentimeters,
      age: input.age,
      bodyFatPercentage: input.bodyFatPercentage,
    });

    return {
      userId: result.userId,
      weightInGrams: result.weightInGrams,
      heightInCentimeters: result.heightInCentimeters,
      age: result.age,
      bodyFatPercentage: result.bodyFatPercentage,
    };
  }
}
