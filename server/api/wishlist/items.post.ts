import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { validatedBody } from '../../utils/validation'

const itemSchema = z.object({ productId: z.string().min(1).max(30) })

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { productId } = await validatedBody(event, itemSchema)
  if (!await prisma.product.findFirst({ where: { id: productId, active: true }, select: { id: true } })) {
    throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  }
  const wishlist = await prisma.wishlist.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} })
  return prisma.wishlistItem.upsert({
    where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    create: { wishlistId: wishlist.id, productId },
    update: {}
  })
})
