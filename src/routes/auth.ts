import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import { jwt } from '../utils/jwt'
import { getJwtSecret } from '../db/init'

type Bindings = {
  DB: D1Database
  ADMIN_PASSWORD: string
}

const auth = new Hono<{ Bindings: Bindings }>()

auth.post('/login', async (c) => {
  const body = await c.req.json<{ password: string }>()

  if (!body.password || body.password !== c.env.ADMIN_PASSWORD) {
    return c.json({ error: 'Invalid password' }, 401)
  }

  const secret = await getJwtSecret(c.env.DB)
  const token = await jwt.sign({ role: 'admin' }, secret)

  setCookie(c, 'token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  })

  return c.json({ success: true })
})

auth.post('/logout', (c) => {
  deleteCookie(c, 'token', { path: '/' })
  return c.json({ success: true })
})

export { auth }
