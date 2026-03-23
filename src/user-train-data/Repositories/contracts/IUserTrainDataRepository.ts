export interface UpsertUserTrainDataRepositoryData {
  weightInGrams: number;
  heightInCentimeters: number;
  age: number;
  bodyFatPercentage: number; // 0-1 (1 = 100%)
}

export interface UserTrainDataWithUser {
  userId: string;
  userName: string | null;
  weightInGrams: number;
  heightInCentimeters: number;
  age: number;
  bodyFatPercentage: number; // 0-1 (1 = 100%)
}

export interface IUserTrainDataRepository {
  upsert(
    userId: string,
    data: UpsertUserTrainDataRepositoryData,
  ): Promise<UpsertUserTrainDataRepositoryData & { userId: string }>;

  findByUserId(userId: string): Promise<UserTrainDataWithUser | null>;
}
