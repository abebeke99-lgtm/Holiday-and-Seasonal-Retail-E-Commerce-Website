import { z } from 'zod'
import { requireUser } from '../../../utils/auth'
import { prisma } from '../../../utils/db'
import { validatedBody } from '../../../utils/validation'

const quantitySchema = z.object({ quantity: z.number().int().min(1).max(99) })

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await validatedBody(event, quantitySchema)
  const id = getRouterParam(event, 'id')!
  const result = await prisma.cartItem.updateMany({
    where: { id, cart: { userId: user.id } },
    data: { quantity: body.quantity }
  })
  if (!result.count) throw createError({ statusCode: 404, statusMessage: 'Cart item not found' })
  return prisma.cartItem.findUnique({ where: { id }, include: { product: true } })
})
