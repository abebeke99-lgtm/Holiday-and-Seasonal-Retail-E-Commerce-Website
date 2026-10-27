import bcrypt from 'bcryptjs'
import { requireAdmin } from '../../../utils/auth'
import { prisma } from '../../../utils/db'
import { adminUserCreateSchema } from '../../../utils/schemas'
import { validatedBody } from '../../../utils/validation'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const body = await validatedBody(event, adminUserCreateSchema)
  const passwordHash = await bcrypt.hash(body.password, 12)
  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name: body.name, email: body.email, passwordHash, role: body.role },
        select: { id: true, name: true, email: true, role: true, active: true, createdAt: true }
      })
      await tx.auditLog.create({
        data: { actorId: actor.id, action: 'create', entity: 'user', entityId: created.id }
      })
      return created
    })
    setResponseStatus(event, 201)
    return user
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'An account with this email already exists' })
    }
    throw error
  }
})
