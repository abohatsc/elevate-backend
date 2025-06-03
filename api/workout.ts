import { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { workoutSchema } from '../src/schemas/workout';
import { withApiKey } from '../utils/auth';
// import { TrainingDayInputDTO } from '../src/types/training'; // Uncomment when available

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const model = process.env.GPT_MODEL || 'gpt-3.5-turbo';

export default withApiKey(async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    // const input: TrainingDayInputDTO = req.body; // Enable when type available
    const input = req.body;

    const systemPrompt = `
You are a professional running coach. Based on the user's training context, return a structured daily running workout.

Your response must follow this structure:
{
  workoutInformation: {
    title: string (max 100),
    description: string (max 150),
    why: string (max 200),
    mentalFuel: string (max 120)
  },
  workoutPlan: {
    workoutId: string,
    segments: [
      {
        type: one of "warmup" | "workout" | "cooldown" | "recovery" | "interval" | "rest",
        duration?: number (seconds),
        distance?: number (kilometers),
        pace?: string ("Z2" or "4:30"),
        heartRate?: string ("120-140"),
        repeat?: number,
        label?: string,
        phase?: string
      }
    ]
  }
}

Keep the tone friendly and inspiring. Only respond with the JSON.
`;

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt.trim() },
        { role: 'user', content: JSON.stringify(input) },
      ],
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content || '';

    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 GPT Request Input:', input);
      console.log('🧠 GPT Prompt:', systemPrompt);
      console.log('📝 GPT Raw Output:', raw);
    }

    const parsed = JSON.parse(raw);
    const validated = workoutSchema.safeParse(parsed);

    if (!validated.success) {
      console.error('❌ Schema validation failed:', validated.error);
      return res.status(400).json({
        error: 'Invalid GPT response format',
        details: validated.error.format(),
      });
    }

    return res.status(200).json(validated.data);

  } catch (error) {
    console.error('🔥 Workout generation failed:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});