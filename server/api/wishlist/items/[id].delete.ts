import { requireUser } from '../../../utils/auth'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const result = await prisma.wishlistItem.deleteMany({
    where: { id: getRouterParam(event, 'id'), wishlist: { userId: user.id } }
  })
  if (!result.count) throw createError({ statusCode: 404, statusMessage: 'Wishlist item not found' })
  return { success: true }
})
