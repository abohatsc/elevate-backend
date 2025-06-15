import { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { workoutSchema } from '../src/schemas/workout';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { withApiKey } from '../utils/auth';
import { TrainingDayInputDTO } from '../src/types/training';

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
    const input: TrainingDayInputDTO = req.body;

    console.log('Input Data:', JSON.stringify(input, null, 2));

    const systemPrompt = `
You are an elite running coach designing daily personalized workouts for the Elevate app.

Your job is to suggest one tailored workout based on the runner's fitness, training load, and recovery metrics. Your coaching philosophy prioritizes daily continuity, progressive overload, and long-term consistency.

Your tone should be grounded, professional, and inspiring — like a trusted coach who knows when to push and when to hold back. Encourage without pressure.

== Context ==
Below is the JSON schema for the expected workout plan. Your response MUST strictly match this schema:
${JSON.stringify(jsonSchema, null, 2)}

== Input Data ==
Here is the runner's data for today:
${JSON.stringify(input, null, 2)}

== Output Instructions ==
- Respond ONLY with a valid JSON object matching the schema above. Do not include any extra text, markdown, or explanations.
- Every workout segment must:
  - Have either a "duration" (in minutes or seconds) or a "distance" (in kilometers or meters). If both are present, "duration" takes precedence.
  - Have either a "targetHeartRate" (with min and max, both between 0-220, min <= max) or a "targetPace" (in "mm:ss" format, e.g., "5:30").
  - Specify a "zone" as "Z1" through "Z5".
  - Specify a "phase" as one of: "warmup", "work", "cooldown".
  - Optionally include a "label" (auto-generate if not provided).
- Do NOT omit any required fields. If a value is not applicable, use null or a reasonable default as per the schema.
- Use only the 13 predefined workout types.
- The "description" field: Max 150 characters. Include specific HR zone(s) or pace (min/km) and workout duration.
- The "why" field: Max 250 characters. Explain why this workout is appropriate today, interpreting fitness and recovery data (do not list numbers).
- The "mentalFuel" field: Max 200 characters. Use emotion and motivation to fuel the runner's mindset today.

== Notes ==
- Your plan must generate valid Apple Workout API segments.
- Consider streak status, recovery trends, recent Z3/Z4 load, and deload state.
- Respect effort distribution over the past week.
- Personalize HR zones intelligently to user data.
- Be cautious with maxing out effort. Real runners need rhythm, not robotic intensity.

== Example Segment ==
{
  "type": "Progression",
  "phase": "work",
  "duration": { "value": 25, "unit": "minutes" },
  "targetPace": { "zone": "Z2", "minPerKm": "5:30", "maxPerKm": "6:00" }
}

Respond ONLY with the final JSON object, no markdown or extra text.
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