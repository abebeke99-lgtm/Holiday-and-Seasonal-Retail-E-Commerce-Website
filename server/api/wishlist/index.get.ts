import { requireUser } from '../../utils/auth'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const wishlist = await prisma.wishlist.findUnique({
    where: { userId: user.id },
    include: { items: { include: { product: { include: { category: true, inventory: true } } } } }
  })
  return wishlist ?? { id: null, items: [] }
})
