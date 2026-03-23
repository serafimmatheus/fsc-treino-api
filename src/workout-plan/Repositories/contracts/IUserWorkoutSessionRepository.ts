export interface UserWorkoutSessionById {
  id: string;
}

export interface IUserWorkoutSessionRepository {
  findActiveByWorkoutDayId(
    workoutDayId: string,
  ): Promise<UserWorkoutSessionById | null>;
  create(userId: string, workoutDayId: string): Promise<{ id: string }>;
}
