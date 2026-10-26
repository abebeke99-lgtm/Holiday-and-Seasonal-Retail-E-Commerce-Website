import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { audit } from '../../../utils/admin'
import { prisma } from '../../../utils/db'
import { validatedBody } from '../../../utils/validation'

const productSchema = z.object({
  sku: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(180),
  slug: z.string().trim().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(10000),
  price: z.number().positive().max(99999999.99),
  imageUrl: z.url().max(2048),
  categoryId: z.string().min(1).max(30),
  quantity: z.number().int().min(0).default(0),
  active: z.boolean().default(true)
})

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const body = await validatedBody(event, productSchema)
  if (!await prisma.category.findUnique({ where: { id: body.categoryId }, select: { id: true } })) {
    throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  }
  try {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          sku: body.sku, name: body.name, slug: body.slug,
          description: body.description, price: body.price,
          imageUrl: body.imageUrl, categoryId: body.categoryId, active: body.active,
          inventory: { create: { quantity: body.quantity } }
        },
        include: { category: true, inventory: true }
      })
      await tx.inventoryMovement.create({
        data: { productId: created.id, change: body.quantity, reason: 'Initial inventory', actorId: actor.id }
      })
      await tx.auditLog.create({ data: { actorId: actor.id, action: 'create', entity: 'product', entityId: created.id } })
      return created
    })
    setResponseStatus(event, 201)
    return product
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'Product SKU or slug already exists' })
    }
    throw error
  }
})
