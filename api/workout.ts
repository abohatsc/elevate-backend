import { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { workoutSchema } from '../src/schemas/workout';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { withApiKey } from '../utils/auth';
// import { TrainingDayInputDTO } from '../src/types/training'; // Uncomment when available

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const model = process.env.GPT_MODEL || 'gpt-3.5-turbo';
const jsonSchema = zodToJsonSchema(workoutSchema, "WorkoutSchema");

export default withApiKey(async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    // const input: TrainingDayInputDTO = req.body; // Enable when type available
    const input = req.body;

    const systemPrompt = `
  You are an elite running coach designing daily personalized workouts for the Elevate app.
  Your task is to suggest a workout based on the runner's fitness and recovery metrics. Keep the tone grounded, clear, and motivating.

  ${JSON.stringify(jsonSchema, null, 2)}

  Keep the tone friendly and inspiring.
  
  == Constraints ==
  - description: Max 150 characters. Include actual HR zone or pace min/km and workout duration in h:mm.
  - why: Max 200 characters. Explain why this workout fits *today*, using training load and health metrics. Do not list numbers—interpret them.
  - mentalFuel: Max 120 characters. Provide a motivational, emotionally resonant message.
  - heartRate: Format must be a range like "120-135" using digits and a hyphen only (no en dash or other characters).

  == Notes ==
  - Use only the 13 allowed workout types.
  - Segment design must be compatible with Apple Workout API (type, duration, HR or pace, label, phase).
  - Consider streaks, deload state, and recent Z3/Z4 efforts.
  - Use smart zone recommendations personalized to user profile.

  Respond with the final JSON object only.
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
    const cleaned = raw.replace(/```json|```/g, '').trim();
  

    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 GPT Request Input:', input);
      console.log('🧠 GPT Prompt:', systemPrompt);
      console.log('📝 GPT Raw Output:', cleaned);
    }

    const parsed = JSON.parse(cleaned);
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