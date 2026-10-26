import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { prisma } from '../../../utils/db'
import { validatedBody } from '../../../utils/validation'

const patchSchema = z.object({
  sku: z.string().trim().min(1).max(80).optional(),
  name: z.string().trim().min(1).max(180).optional(),
  slug: z.string().trim().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().max(10000).optional(),
  price: z.number().positive().max(99999999.99).optional(),
  imageUrl: z.url().max(2048).optional(),
  categoryId: z.string().min(1).max(30).optional(),
  active: z.boolean().optional()
}).refine((body) => Object.keys(body).length > 0)

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const body = await validatedBody(event, patchSchema)
  if (body.categoryId && !await prisma.category.findUnique({ where: { id: body.categoryId }, select: { id: true } })) {
    throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  }
  try {
    const result = await prisma.product.updateMany({ where: { id }, data: body })
    if (!result.count) throw createError({ statusCode: 404, statusMessage: 'Product not found' })
    await prisma.auditLog.create({ data: { actorId: actor.id, action: 'update', entity: 'product', entityId: id } })
    return prisma.product.findUnique({ where: { id }, include: { category: true, inventory: true } })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'Product SKU or slug already exists' })
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2003') {
      throw createError({ statusCode: 404, statusMessage: 'Category not found' })
    }
    throw error
  }
})
