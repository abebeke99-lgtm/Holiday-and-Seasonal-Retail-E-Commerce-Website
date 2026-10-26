import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../../utils/db'
import { sessionFor } from '../../utils/auth'
import { validatedBody } from '../../utils/validation'

const credentials = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(72)
})

export default defineEventHandler(async (event) => {
  const body = await validatedBody(event, credentials)
  const user = await prisma.user.findUnique({ where: { email: body.email } })
  if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
  }
  const session = await sessionFor(event)
  await session.clear()
  await session.update({ userId: user.id })
  return { id: user.id, name: user.name, email: user.email, role: user.role }
})
