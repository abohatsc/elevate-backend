export interface TrainingDayInputDTO {
  // Date and Context
  date: Date;                    // Training day being evaluated
  
  // Training Load Metrics (TRIMP - Training Impulse)
  trimp7dAdjusted: number;       // 7-day adjusted TRIMP
  trimp28dAdjusted: number;      // 28-day adjusted TRIMP
  trimp90dAdjusted: number;      // 90-day adjusted TRIMP
  acuteChronicRatio: number;     // AC/CL ratio
  chronicLoadRatio: number;      // CLR ratio
  
  // Recovery Metrics
  hrv?: number;                  // Heart Rate Variability (ms)
  rhr?: number;                  // Resting Heart Rate (bpm)
  sleepHours?: number;           // Sleep duration (hours)
  sleepQuality?: number;         // Sleep quality (0-1 scale)
  
  // Training History
  lastRunningWorkouts: TrainingWorkoutInput[];  // Last 5 workouts
  daysSinceLastRunningWorkout: number;          // Days since last run
  daysSinceLastRest: number;                    // Days since last rest
  
  // Fitness Metrics
  vo2Max?: number;               // VO2 Max (ml/kg/min)
  fitnessTier: FitnessTier;      // Current fitness level
  fitnessTrend: FitnessTrend;    // Fitness trend direction
  
  // Environmental Context
  temperature?: number;          // Temperature in Celsius
  city?: string;                 // Current city
  
  // Training Strategy
  trainingStrategy: TrainingStrategy;  // Default: impliedProgression
}

export interface TrainingWorkoutInput {
  date: Date;                    // When the workout occurred
  distance: number;              // Distance in kilometers
  duration: number;              // Duration in seconds
  type: string;                  // Type of workout
  rpe?: number;                  // Rate of Perceived Exertion (1-10)
  hrZoneDistribution?: {         // Heart rate zone distribution
    [zone: number]: number;      // Zone number -> duration in seconds
  };
}

export type FitnessTier = 'beginner' | 'intermediate' | 'advanced';
export type FitnessTrend = 'improving' | 'stable' | 'declining';
export type TrainingStrategy = 'impliedProgression' | 'other'; 