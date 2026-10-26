import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { prisma } from '../../../utils/db'
import { validatedBody } from '../../../utils/validation'

const categorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
})

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const body = await validatedBody(event, categorySchema)
  try {
    const category = await prisma.category.create({ data: body })
    await prisma.auditLog.create({ data: { actorId: actor.id, action: 'create', entity: 'category', entityId: category.id } })
    setResponseStatus(event, 201)
    return category
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'Category name or slug already exists' })
    }
    throw error
  }
})
