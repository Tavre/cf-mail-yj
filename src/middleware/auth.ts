import { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { jwt } from '../utils/jwt'
import { getJwtSecret } from '../db/init'

const PUBLIC_PATHS = ['/api/login', '/api/health', '/api/config']

export async function authMiddleware(c: Context, next: Next) {
  const path = new URL(c.req.url).pathname

  if (PUBLIC_PATHS.includes(path)) {
    return next()
  }

  if (!path.startsWith('/api/')) {
    return next()
  }

  const token = getCookie(c, 'token')
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const secret = await getJwtSecret(c.env.DB)
  const payload = await jwt.verify(token, secret)
  if (!payload) {
    return c.json({ error: 'Invalid token' }, 401)
  }

  return next()
}
