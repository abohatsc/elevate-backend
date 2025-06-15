import { z } from 'zod';

// Enums
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
  "Strides"
]);

export const phaseEnum = z.enum(["warmup", "work", "cooldown"]);
export const durationUnitEnum = z.enum(["minutes", "seconds", "kilometers"]);
export const distanceUnitEnum = z.enum(["kilometers", "meters"]);

// Base schemas for reusable components
export const durationSchema = z.object({
  value: z.number().positive(),
  unit: durationUnitEnum
});

export const distanceSchema = z.object({
  value: z.number().positive(),
  unit: distanceUnitEnum
});

export const targetHeartRateSchema = z.object({
  min: z.number().min(0).max(220),
  max: z.number().min(0).max(220)
}).refine(data => data.min <= data.max, {
  message: "Minimum heart rate must be less than or equal to maximum heart rate"
});

export const targetPaceSchema = z.object({
  zone: z.string().regex(/^Z[1-5]$/),
  minPerKm: z.string().regex(/^([0-5]?\d):[0-5]\d$/),
  maxPerKm: z.string().regex(/^([0-5]?\d):[0-5]\d$/)
}).refine(data => {
  const [minMin, minSec] = data.minPerKm.split(':').map(Number);
  const [maxMin, maxSec] = data.maxPerKm.split(':').map(Number);
  const minTotal = minMin * 60 + minSec;
  const maxTotal = maxMin * 60 + maxSec;
  return minTotal <= maxTotal;
}, {
  message: "Minimum pace must be faster than or equal to maximum pace"
});

export const metadataSchema = z.object({
  note: z.string().optional(),
  effortLevel: z.number().min(1).max(5).optional()
});

// Define the workout segment type
type WorkoutSegmentType = {
  type: z.infer<typeof workoutTypeEnum>;
  label?: string;
  phase: z.infer<typeof phaseEnum>;
  duration?: z.infer<typeof durationSchema>;
  distance?: z.infer<typeof distanceSchema>;
  targetHeartRate?: z.infer<typeof targetHeartRateSchema>;
  targetPace?: z.infer<typeof targetPaceSchema>;
  isWarmup?: boolean;
  isCooldown?: boolean;
  metadata?: z.infer<typeof metadataSchema>;
  repeat?: {
    times: number;
    steps: WorkoutSegmentType[];
  };
};

// Create the workout segment schema with recursive type handling
export const workoutSegmentSchema: z.ZodType<WorkoutSegmentType> = z.lazy(() => {
  const repeatSchema = z.object({
    times: z.number().int().positive(),
    steps: z.array(workoutSegmentSchema)
  });

  return z.object({
    type: workoutTypeEnum,
    label: z.string().optional(),
    phase: phaseEnum,
    duration: durationSchema.optional(),
    distance: distanceSchema.optional(),
    targetHeartRate: targetHeartRateSchema.optional(),
    targetPace: targetPaceSchema.optional(),
    isWarmup: z.boolean().optional(),
    isCooldown: z.boolean().optional(),
    metadata: metadataSchema.optional(),
    repeat: repeatSchema.optional()
  }).refine(
    data => data.duration !== undefined || data.distance !== undefined,
    {
      message: "Either duration or distance must be specified"
    }
  ).refine(
    data => data.targetHeartRate !== undefined || data.targetPace !== undefined,
    {
      message: "Either target heart rate or target pace must be specified"
    }
  );
});

// Create the workout information schema
export const workoutInformationSchema = z.object({
  title: z.string().max(100),
  description: z.string().max(150),
  why: z.string().max(250),
  mentalFuel: z.string().max(200)
});

// Create the workout plan schema
export const workoutPlanSchema = z.object({
  workoutId: z.string().min(1).max(100),
  segments: z.array(workoutSegmentSchema).min(1)
});

// Create the main workout schema
export const workoutSchema = z.object({
  workoutInformation: workoutInformationSchema,
  workoutPlan: workoutPlanSchema
});

// Type exports
export type WorkoutType = z.infer<typeof workoutTypeEnum>;
export type Phase = z.infer<typeof phaseEnum>;
export type DurationUnit = z.infer<typeof durationUnitEnum>;
export type DistanceUnit = z.infer<typeof distanceUnitEnum>;
export type WorkoutInformation = z.infer<typeof workoutInformationSchema>;
export type WorkoutPlan = z.infer<typeof workoutPlanSchema>;
export type Workout = z.infer<typeof workoutSchema>;
export type WorkoutSegment = WorkoutSegmentType;