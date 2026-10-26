import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { prisma } from '../../../utils/db'
import { validatedBody } from '../../../utils/validation'

const collectionSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  slug: z.string().trim().min(1).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().max(10000).optional(),
  active: z.boolean().optional(),
  productIds: z.array(z.string().min(1).max(30)).max(500).refine(ids => new Set(ids).size === ids.length).optional()
}).refine(body => Object.keys(body).length > 0)

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const body = await validatedBody(event, collectionSchema)
  const { productIds, ...fields } = body
  if (!await prisma.collection.findUnique({ where: { id }, select: { id: true } })) {
    throw createError({ statusCode: 404, statusMessage: 'Collection not found' })
  }
  if (productIds?.length) {
    const count = await prisma.product.count({ where: { id: { in: productIds } } })
    if (count !== productIds.length) throw createError({ statusCode: 404, statusMessage: 'One or more products were not found' })
  }
  try {
    const result = await prisma.$transaction(async tx => {
      if (productIds) {
        await tx.collectionProduct.deleteMany({ where: { collectionId: id } })
        await tx.collectionProduct.createMany({ data: productIds.map(productId => ({ collectionId: id, productId })) })
      }
      const updated = Object.keys(fields).length
        ? await tx.collection.update({ where: { id }, data: fields, include: { products: true } })
        : await tx.collection.findUniqueOrThrow({ where: { id }, include: { products: true } })
      await tx.auditLog.create({ data: { actorId: actor.id, action: 'update', entity: 'collection', entityId: id } })
      return updated
    })
    return result
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      throw createError({ statusCode: 404, statusMessage: 'Collection not found' })
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'Collection slug already exists' })
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2003') {
      throw createError({ statusCode: 404, statusMessage: 'One or more products were not found' })
    }
    throw error
  }
})
