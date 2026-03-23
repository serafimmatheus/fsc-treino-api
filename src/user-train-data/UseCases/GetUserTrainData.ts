import type { IUserTrainDataRepository } from "../Repositories/contracts/IUserTrainDataRepository.js";

export interface GetUserTrainDataInput {
  userId: string;
}

export interface GetUserTrainDataOutput {
  userId: string;
  userName: string;
  weightInGrams: number;
  heightInCentimeters: number;
  age: number;
  bodyFatPercentage: number; // 1 representa 100%
}

export class GetUserTrainData {
  constructor(
    private readonly userTrainDataRepository: IUserTrainDataRepository,
  ) {}

  async execute(
    input: GetUserTrainDataInput,
  ): Promise<GetUserTrainDataOutput | null> {
    const data = await this.userTrainDataRepository.findByUserId(input.userId);

    if (!data) return null;

    return {
      userId: data.userId,
      userName: data.userName ?? "",
      weightInGrams: data.weightInGrams,
      heightInCentimeters: data.heightInCentimeters,
      age: data.age,
      bodyFatPercentage: data.bodyFatPercentage,
    };
  }
}
