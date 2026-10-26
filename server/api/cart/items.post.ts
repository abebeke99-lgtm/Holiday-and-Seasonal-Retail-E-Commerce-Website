import { requireUser } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { validatedBody } from '../../utils/validation'
import { cartItemSchema } from '../../utils/schemas'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await validatedBody(event, cartItemSchema)
  const product = await prisma.product.findFirst({ where: { id: body.productId, active: true } })
  if (!product) throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  const cart = await prisma.cart.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} })
  return prisma.$transaction(async (tx) => {
    const existing = await tx.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId: body.productId } }
    })
    if (existing && existing.quantity + body.quantity > 99) {
      throw createError({ statusCode: 400, statusMessage: 'A maximum of 99 units per product is allowed' })
    }
    if (existing) {
      return tx.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + body.quantity } })
    }
    return tx.cartItem.create({
      data: { cartId: cart.id, productId: body.productId, quantity: body.quantity }
    })
  }, { isolationLevel: 'Serializable' })
})
