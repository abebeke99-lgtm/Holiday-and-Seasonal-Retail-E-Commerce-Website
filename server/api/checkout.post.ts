import { Prisma } from '@prisma/client'
import { requireUser } from '../utils/auth'
import { prisma } from '../utils/db'
import { calculateSubtotal } from '../utils/pricing'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const idempotencyKey = getHeader(event, 'idempotency-key')
  if (idempotencyKey && !/^[a-zA-Z0-9._:-]{8,100}$/.test(idempotencyKey)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid idempotency key' })
  }
  try {
    return await prisma.$transaction(async (tx) => {
      if (idempotencyKey) {
        const existing = await tx.order.findUnique({ where: { idempotencyKey }, include: { items: true, payment: true } })
        if (existing) {
          if (existing.userId !== user.id) throw createError({ statusCode: 409, statusMessage: 'Idempotency key is already in use' })
          return existing
        }
      }
      const cart = await tx.cart.findUnique({
        where: { userId: user.id },
        include: { items: { include: { product: { include: { inventory: true } } } } }
      })
      if (!cart?.items.length) throw createError({ statusCode: 400, statusMessage: 'Cart is empty' })
      for (const item of cart.items) {
        if (!item.product.active || !item.product.inventory || item.product.inventory.quantity < item.quantity) {
          throw createError({ statusCode: 409, statusMessage: `Insufficient inventory for ${item.product.name}` })
        }
      }
      const subtotal = calculateSubtotal(cart.items.map(item => ({
        price: item.product.price,
        quantity: item.quantity
      })))
      const order = await tx.order.create({
        data: {
          userId: user.id,
          subtotal,
          total: subtotal,
          idempotencyKey,
          items: {
            create: cart.items.map(({ product, quantity }) => ({
              productId: product.id,
              name: product.name,
              sku: product.sku,
              unitPrice: product.price,
              quantity
            }))
          },
          payment: { create: { amount: subtotal, status: 'PENDING' } }
        },
        include: { items: true, payment: true }
      })
      for (const item of cart.items) {
        const stock = await tx.inventory.updateMany({
          where: { productId: item.productId, quantity: { gte: item.quantity } },
          data: { quantity: { decrement: item.quantity } }
        })
        if (!stock.count) throw createError({ statusCode: 409, statusMessage: `Insufficient inventory for ${item.product.name}` })
        await tx.inventoryMovement.create({
          data: { productId: item.productId, change: -item.quantity, reason: `Order ${order.id}`, actorId: user.id }
        })
      }
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } })
      return order
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && idempotencyKey) {
      const existing = await prisma.order.findUnique({ where: { idempotencyKey }, include: { items: true, payment: true } })
      if (existing?.userId === user.id) return existing
      throw createError({ statusCode: 409, statusMessage: 'Idempotency key is already in use' })
    }
    throw error
  }
})
