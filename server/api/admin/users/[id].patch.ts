import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { wouldRemoveLastActiveAdmin } from '../../../utils/admin-user-policy'
import { prisma } from '../../../utils/db'
import { adminUserUpdateSchema } from '../../../utils/schemas'
import { validatedBody } from '../../../utils/validation'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const parsedId = z.string().min(1).max(30).safeParse(getRouterParam(event, 'id'))
  if (!parsedId.success) throw createError({ statusCode: 400, statusMessage: 'Invalid user ID' })
  const id = parsedId.data
  const body = await validatedBody(event, adminUserUpdateSchema)
  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM \`User\` FOR UPDATE`
      const current = await tx.user.findUnique({
        where: { id },
        select: { id: true, role: true, active: true }
      })
      if (!current) throw createError({ statusCode: 404, statusMessage: 'User not found' })
      if (current.id === actor.id && (body.role && body.role !== 'ADMIN' || body.active === false)) {
        throw createError({ statusCode: 400, statusMessage: 'You cannot remove your own administrator access' })
      }
      const activeAdminCount = await tx.user.count({ where: { role: 'ADMIN', active: true } })
      if (wouldRemoveLastActiveAdmin(current, body, activeAdminCount)) {
        throw createError({ statusCode: 409, statusMessage: 'The last active administrator cannot be deactivated or demoted' })
      }
      const user = await tx.user.update({
        where: { id },
        data: body,
        select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, updatedAt: true }
      })
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: body.role ? 'role-update' : body.active !== undefined ? 'status-update' : 'update',
          entity: 'user',
          entityId: user.id
        }
      })
      return user
    })
    return updated
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'An account with this email already exists' })
    }
    throw error
  }
})
