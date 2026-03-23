export interface UserWorkoutSessionById {
  id: string;
}

export interface IUserWorkoutSessionRepository {
  findActiveByUserId(userId: string): Promise<UserWorkoutSessionById | null>;
  findActiveByWorkoutDayId(
    workoutDayId: string,
  ): Promise<UserWorkoutSessionById | null>;
  create(userId: string, workoutDayId: string): Promise<{ id: string }>;
}
