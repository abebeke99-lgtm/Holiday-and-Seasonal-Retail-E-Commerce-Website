import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { prisma } from '../../../utils/db'
import { validatedBody } from '../../../utils/validation'

const collectionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(10000).default(''),
  active: z.boolean().default(true),
  productIds: z.array(z.string().min(1).max(30)).max(500).default([]).refine(ids => new Set(ids).size === ids.length)
})

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const body = await validatedBody(event, collectionSchema)
  if (body.productIds.length) {
    const count = await prisma.product.count({ where: { id: { in: body.productIds } } })
    if (count !== body.productIds.length) throw createError({ statusCode: 404, statusMessage: 'One or more products were not found' })
  }
  try {
    const collection = await prisma.collection.create({
      data: {
        name: body.name, slug: body.slug, description: body.description, active: body.active,
        products: { create: body.productIds.map(productId => ({ productId })) }
      },
      include: { products: true }
    })
    await prisma.auditLog.create({ data: { actorId: actor.id, action: 'create', entity: 'collection', entityId: collection.id } })
    setResponseStatus(event, 201)
    return collection
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'Collection slug already exists' })
    }
    throw error
  }
})
