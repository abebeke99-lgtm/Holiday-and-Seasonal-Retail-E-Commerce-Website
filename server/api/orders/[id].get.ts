import { requireUser } from '../../utils/auth'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const order = await prisma.order.findFirst({
    where: { id: getRouterParam(event, 'id'), userId: user.id },
    include: { items: true, payment: true }
  })
  if (!order) throw createError({ statusCode: 404, statusMessage: 'Order not found' })
  return order
})
