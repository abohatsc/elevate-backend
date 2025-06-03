import type { VercelRequest, VercelResponse } from '@vercel/node'

export function withApiKey(
  handler: (req: VercelRequest, res: VercelResponse) => void
) {
  return function (req: VercelRequest, res: VercelResponse) {
    const authHeader = req.headers['authorization']
    const expected = `Bearer ${process.env.API_KEY}`

    if (authHeader !== expected) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    return handler(req, res)
  }
}