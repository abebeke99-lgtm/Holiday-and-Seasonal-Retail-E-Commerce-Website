import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { prisma } from '../../../utils/db'
import { validatedBody } from '../../../utils/validation'

const patchSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional()
}).refine((body) => Object.keys(body).length > 0)

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const body = await validatedBody(event, patchSchema)
  try {
    const result = await prisma.category.updateMany({ where: { id }, data: body })
    if (!result.count) throw createError({ statusCode: 404, statusMessage: 'Category not found' })
    await prisma.auditLog.create({ data: { actorId: actor.id, action: 'update', entity: 'category', entityId: id } })
    return prisma.category.findUnique({ where: { id } })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'Category name or slug already exists' })
    }
    throw error
  }
})
