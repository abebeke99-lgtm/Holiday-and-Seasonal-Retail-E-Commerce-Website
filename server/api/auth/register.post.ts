import bcrypt from 'bcryptjs'
import { prisma } from '../../utils/db'
import { sessionFor } from '../../utils/auth'
import { validatedBody } from '../../utils/validation'
import { registrationSchema } from '../../utils/schemas'

export default defineEventHandler(async (event) => {
  const body = await validatedBody(event, registrationSchema)
  const passwordHash = await bcrypt.hash(body.password, 12)
  try {
    const user = await prisma.user.create({
      data: { name: body.name, email: body.email, passwordHash },
      select: { id: true, name: true, email: true, role: true }
    })
    const session = await sessionFor(event)
    await session.update({ userId: user.id })
    return user
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'An account with this email already exists' })
    }
    throw error
  }
})
