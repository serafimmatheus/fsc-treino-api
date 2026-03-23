import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

import type { WeekDay } from "../../generated/prisma/enums.js";
import type { IUserWorkoutSessionRepository } from "../../workout-plan/Repositories/contracts/IUserWorkoutSessionRepository.js";
import type { IWorkoutPlanRepository } from "../../workout-plan/Repositories/contracts/IWorkoutPlanRepository.js";

dayjs.extend(utc);

const WEEKDAY_TO_STRING: Record<number, WeekDay> = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

const WEEKDAY_ORDER: WeekDay[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export interface GetHomeDataInput {
  userId: string;
  date: string;
}

export interface GetHomeDataOutput {
  activeWorkoutPlanId: string | null;
  todayWorkoutDay: {
    workoutPlanId: string;
    id: string;
    name: string;
    isRest: boolean;
    weekDay: WeekDay;
    estimatedDurationInSeconds: number;
    coverImageUrl?: string;
    exercisesCount: number;
  } | null;
  workoutStreak: number;
  consistencyByDay: Record<
    string,
    { workoutDayCompleted: boolean; workoutDayStarted: boolean }
  >;
}

export class GetHomeData {
  constructor(
    private readonly workoutPlanRepository: IWorkoutPlanRepository,
    private readonly userWorkoutSessionRepository: IUserWorkoutSessionRepository,
  ) {}

  async execute(input: GetHomeDataInput): Promise<GetHomeDataOutput> {
    const { userId, date } = input;

    const dateUtc = dayjs.utc(date);
    const weekStart = dateUtc.day(0).startOf("day").toDate();
    const weekEnd = dateUtc.day(6).endOf("day").toDate();

    const consistencyByDay = this.buildEmptyConsistencyByDay(weekStart);

    const sessions =
      await this.userWorkoutSessionRepository.findByUserIdAndDateRange(
        userId,
        weekStart,
        weekEnd,
      );

    this.fillConsistencyByDay(consistencyByDay, sessions);

    const workoutPlan =
      await this.workoutPlanRepository.findActiveByUserId(userId);

    if (!workoutPlan) {
      return {
        activeWorkoutPlanId: null,
        todayWorkoutDay: null,
        workoutStreak: 0,
        consistencyByDay,
      };
    }

    const dateWeekday = dateUtc.day() as keyof typeof WEEKDAY_TO_STRING;
    const targetWeekDay = WEEKDAY_TO_STRING[dateWeekday];

    const todayWorkoutDay = workoutPlan.workoutDays.find(
      (wd) => wd.weekDay === targetWeekDay,
    );

    const workoutStreak = this.calculateWorkoutStreak(
      workoutPlan.workoutDays,
      sessions,
    );

    return {
      activeWorkoutPlanId: workoutPlan.id,
      todayWorkoutDay: todayWorkoutDay
        ? {
            workoutPlanId: workoutPlan.id,
            id: todayWorkoutDay.id,
            name: todayWorkoutDay.name,
            isRest: todayWorkoutDay.isRest,
            weekDay: todayWorkoutDay.weekDay,
            estimatedDurationInSeconds: todayWorkoutDay.estimatedDurationInSeconds,
            coverImageUrl: todayWorkoutDay.coverImageUrl ?? undefined,
            exercisesCount: todayWorkoutDay.workoutExercises.length,
          }
        : null,
      workoutStreak,
      consistencyByDay,
    };
  }

  private buildEmptyConsistencyByDay(
    weekStart: Date,
  ): Record<string, { workoutDayCompleted: boolean; workoutDayStarted: boolean }> {
    const result: Record<
      string,
      { workoutDayCompleted: boolean; workoutDayStarted: boolean }
    > = {};
    for (let i = 0; i < 7; i++) {
      const d = dayjs.utc(weekStart).add(i, "day").format("YYYY-MM-DD");
      result[d] = { workoutDayCompleted: false, workoutDayStarted: false };
    }
    return result;
  }

  private fillConsistencyByDay(
    consistencyByDay: Record<
      string,
      { workoutDayCompleted: boolean; workoutDayStarted: boolean }
    >,
    sessions: Array<{ startedAt: Date; completedAt: Date | null }>,
  ): void {
    for (const session of sessions) {
      const dateKey = dayjs.utc(session.startedAt).format("YYYY-MM-DD");
      if (dateKey in consistencyByDay) {
        consistencyByDay[dateKey].workoutDayStarted = true;
        if (session.completedAt) {
          consistencyByDay[dateKey].workoutDayCompleted = true;
        }
      }
    }
  }

  private calculateWorkoutStreak(
    workoutDays: Array<{
      id: string;
      weekDay: WeekDay;
    }>,
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
