import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { prisma } from '../../../utils/db'
import { validatedBody } from '../../../utils/validation'

const adjustmentSchema = z.object({
  productId: z.string().min(1).max(30),
  quantity: z.number().int().min(0).max(1000000),
  reason: z.string().trim().min(1).max(200)
})

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const body = await validatedBody(event, adjustmentSchema)
  const result = await prisma.$transaction(async tx => {
    const before = await tx.inventory.findUnique({ where: { productId: body.productId } })
    if (!before) throw createError({ statusCode: 404, statusMessage: 'Inventory record not found' })
    const updated = await tx.inventory.update({ where: { productId: body.productId }, data: { quantity: body.quantity } })
    await tx.inventoryMovement.create({
      data: { productId: body.productId, change: body.quantity - before.quantity, reason: body.reason, actorId: actor.id }
    })
    await tx.auditLog.create({
      data: { actorId: actor.id, action: 'adjust-inventory', entity: 'product', entityId: body.productId }
    })
    return updated
  })
  return result
})
