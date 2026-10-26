import type { H3Event } from 'h3'
import { createError, useSession } from 'h3'
import { prisma } from './db'

export async function sessionFor(event: H3Event) {
  const config = useRuntimeConfig(event)
  if (config.sessionPassword.length < 32) {
    throw createError({ statusCode: 500, statusMessage: 'Session secret is not configured' })
  }
  return useSession(event, {
    name: 'seasonmart_session',
    password: config.sessionPassword,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    }
  })
}

export async function requireUser(event: H3Event) {
  const session = await sessionFor(event)
  const userId = session.data.userId
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, role: true } })
  if (!user) {
    await session.clear()
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }
  return user
}

export async function requireAdmin(event: H3Event) {
  const user = await requireUser(event)
  if (user.role !== 'ADMIN') {
    throw createError({ statusCode: 403, statusMessage: 'Administrator access required' })
  }
  return user
}
