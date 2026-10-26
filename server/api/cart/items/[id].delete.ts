import { requireUser } from '../../../utils/auth'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const result = await prisma.cartItem.deleteMany({
    where: { id: getRouterParam(event, 'id'), cart: { userId: user.id } }
  })
  if (!result.count) throw createError({ statusCode: 404, statusMessage: 'Cart item not found' })
  return { success: true }
})
