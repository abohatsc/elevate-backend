import { z } from 'zod';


export const workoutTypeEnum = z.enum([
  "Easy",
  "Recovery",
  "Long",
  "Steady",
  "Tempo",
  "Threshold",
  "Progression",
  "Intervals",
  "Interval Ladder",
  "Sprint Intervals",
  "Benchmark",
  "Strides",
  "Rest Day"
]);

export const segmentTypeEnum = workoutTypeEnum;

export const workoutSchema = z.object({
  workoutInformation: z.object({
    title: z.string().max(100),
    type: workoutTypeEnum,
    description: z.string().max(150),
    why: z.string().max(250),
    mentalFuel: z.string().max(250),
  }),
  workoutPlan: z.object({
    workoutId: z.string().min(1).max(100),
    segments: z.array(
      z.object({
        type: segmentTypeEnum,
        duration: z.number().min(0).optional(),
        distance: z.number().min(0).optional(),
        pace: z.string().regex(/^(\d{1,2}:\d{2}|Z[1-5])$/).optional(),
        heartRate: z.string().regex(/^\d{2,3}-\d{2,3}$/).optional(),
        repeat: z.number().min(1).optional(),
        label: z.string().optional(),
        phase: z.string().optional(),
      })
    ).min(1),
  }),
});