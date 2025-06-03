import { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    workoutType: "Steady",
    instruction: "Run 30min in Zone 2.",
    why: "You’re recovered and ready for aerobic development.",
    mentalFuel: "Every step counts toward greatness."
  });
}