import { requireUser } from '../../utils/auth'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const cart = await prisma.cart.findUnique({
    where: { userId: user.id },
    include: { items: { include: { product: { include: { inventory: true } } } } }
  })
  return cart ?? { id: null, items: [] }
})
