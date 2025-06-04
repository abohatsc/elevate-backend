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

Your role is to suggest one tailored workout based on the runner's fitness, training load, and recovery metrics. Your coaching philosophy prioritizes *daily continuity*, *progressive overload*, and *long-term consistency*, not rigid plans.

Your tone should be grounded, professional, and inspiring — like a trusted coach who knows when to push and when to hold back. Encourage without pressure.

== Context ==
${JSON.stringify(jsonSchema, null, 2)}

== Constraints ==
- description: Max 150 characters. Include specific HR zone(s) or pace (min/km) and workout duration.
- why: Max 200 characters. Explain why this workout is appropriate *today*, interpreting fitness and recovery data (do not list numbers).
- mentalFuel: Max 120 characters. Use emotion and motivation to fuel the runner’s mindset today.
- heartRate: Format as "120-135" (digits and hyphen only, no units or symbols).
- pace must be either:
  • format "Z1" to "Z5" (for HR zone) or
  • format "mm:ss" (e.g. "4:30", "10:45")
  Any other format is invalid.

== Notes ==
- Choose from the 13 predefined workout types only.
- Your plan must generate valid Apple Workout API segments (type, duration, heartRate or pace, label, phase).
- Consider streak status, recovery trends, recent Z3/Z4 load, and deload state — but do not default to full rest unless recovery flags are active.
- Respect effort distribution over the past week: if the athlete had intensity recently, consider lighter aerobic structure; if underloaded, safely reintroduce stimulus.
- Personalize HR zones intelligently to user data — avoid generic ranges.
- Be cautious with maxing out effort. Real runners need rhythm, not robotic intensity.

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