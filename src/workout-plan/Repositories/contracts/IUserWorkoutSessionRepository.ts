export interface UserWorkoutSessionById {
  id: string;
}

export interface UserWorkoutSessionWithDetails {
  id: string;
  userId: string;
  workoutDayId: string;
  startedAt: Date;
  completedAt: Date | null;
}

export interface UserWorkoutSessionUpdated {
  id: string;
  startedAt: Date;
  completedAt: Date;
}

export interface UserWorkoutSessionInRange {
  id: string;
  workoutDayId: string;
  startedAt: Date;
  completedAt: Date | null;
}

export interface IUserWorkoutSessionRepository {
  findActiveByUserId(userId: string): Promise<UserWorkoutSessionById | null>;
  findActiveByWorkoutDayId(
    workoutDayId: string,
  ): Promise<UserWorkoutSessionById | null>;
  findCompletedByUserIdAndWorkoutDayId(
    userId: string,
    workoutDayId: string,
  ): Promise<UserWorkoutSessionById | null>;
  findById(sessionId: string): Promise<UserWorkoutSessionWithDetails | null>;
  findByUserIdAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<UserWorkoutSessionInRange[]>;
  create(userId: string, workoutDayId: string): Promise<{ id: string }>;
  updateCompletedAt(
    sessionId: string,
    completedAt: Date,
  ): Promise<UserWorkoutSessionUpdated>;
}
