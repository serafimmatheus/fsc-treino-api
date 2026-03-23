import z from "zod";

export const GetUserTrainDataResponseSchema = z
  .object({
    userId: z.string(),
    userName: z.string(),
    weightInGrams: z.number().int().min(0),
    heightInCentimeters: z.number().int().min(1),
    age: z.number().int().min(1),
    bodyFatPercentage: z.number().min(0).max(1),
  })
  .nullable();

export const UpsertUserTrainDataBodySchema = z.object({
  weightInGrams: z.number().int().min(0),
  heightInCentimeters: z.number().int().min(1),
  age: z.number().int().min(1),
  bodyFatPercentage: z.number().min(0).max(1),
});
