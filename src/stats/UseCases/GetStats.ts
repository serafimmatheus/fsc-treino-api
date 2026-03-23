import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

import type { WeekDay } from "../../generated/prisma/enums.js";
import type { IUserWorkoutSessionRepository } from "../../workout-plan/Repositories/contracts/IUserWorkoutSessionRepository.js";
import type { IWorkoutPlanRepository } from "../../workout-plan/Repositories/contracts/IWorkoutPlanRepository.js";

dayjs.extend(utc);

const WEEKDAY_ORDER: WeekDay[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export interface GetStatsInput {
  userId: string;
  from: string;
  to: string;
}

export interface GetStatsOutput {
  workoutStreak: number;
  consistencyByDay: Record<
    string,
    { workoutDayCompleted: boolean; workoutDayStarted: boolean }
  >;
  completedWorkoutsCount: number;
  conclusionRate: number;
  totalTimeInSeconds: number;
}

export class GetStats {
  constructor(
    private readonly workoutPlanRepository: IWorkoutPlanRepository,
    private readonly userWorkoutSessionRepository: IUserWorkoutSessionRepository,
  ) {}

  async execute(input: GetStatsInput): Promise<GetStatsOutput> {
    const { userId, from, to } = input;

    const startDate = dayjs.utc(from).startOf("day").toDate();
    const endDate = dayjs.utc(to).endOf("day").toDate();

    const sessions =
      await this.userWorkoutSessionRepository.findByUserIdAndDateRange(
        userId,
        startDate,
        endDate,
      );

    const consistencyByDay = this.buildConsistencyByDay(sessions);
    const completedWorkoutsCount = sessions.filter(
      (s) => s.completedAt !== null,
    ).length;
    const conclusionRate =
      sessions.length > 0 ? completedWorkoutsCount / sessions.length : 0;
    const totalTimeInSeconds = this.calculateTotalTimeInSeconds(sessions);

    const workoutPlan =
      await this.workoutPlanRepository.findActiveByUserId(userId);
    const workoutStreak = workoutPlan
      ? this.calculateWorkoutStreak(workoutPlan.workoutDays, sessions)
      : 0;

    return {
      workoutStreak,
      consistencyByDay,
      completedWorkoutsCount,
      conclusionRate,
      totalTimeInSeconds,
    };
  }

  private buildConsistencyByDay(
    sessions: Array<{ startedAt: Date; completedAt: Date | null }>,
  ): Record<
    string,
    { workoutDayCompleted: boolean; workoutDayStarted: boolean }
  > {
    const result: Record<
      string,
      { workoutDayCompleted: boolean; workoutDayStarted: boolean }
    > = {};

    for (const session of sessions) {
      const dateKey = dayjs.utc(session.startedAt).format("YYYY-MM-DD");
      if (!(dateKey in result)) {
        result[dateKey] = { workoutDayCompleted: false, workoutDayStarted: false };
      }
      result[dateKey].workoutDayStarted = true;
      if (session.completedAt) {
        result[dateKey].workoutDayCompleted = true;
      }
    }

    return result;
  }

  private calculateTotalTimeInSeconds(
    sessions: Array<{ startedAt: Date; completedAt: Date | null }>,
  ): number {
    return sessions
      .filter((s): s is { startedAt: Date; completedAt: Date } => s.completedAt !== null)
      .reduce(
        (acc, s) =>
          acc + Math.round((s.completedAt.getTime() - s.startedAt.getTime()) / 1000),
        0,
      );
  }

  private calculateWorkoutStreak(
    workoutDays: Array<{ id: string; weekDay: WeekDay }>,
    sessions: Array<{ workoutDayId: string; completedAt: Date | null }>,
  ): number {
    const completedWorkoutDayIds = new Set(
      sessions
        .filter((s) => s.completedAt !== null)
        .map((s) => s.workoutDayId),
    );

    const sortedDays = [...workoutDays].sort(
      (a, b) =>
        WEEKDAY_ORDER.indexOf(a.weekDay) - WEEKDAY_ORDER.indexOf(b.weekDay),
    );

    let streak = 0;
    for (const day of sortedDays) {
      if (completedWorkoutDayIds.has(day.id)) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }
}
