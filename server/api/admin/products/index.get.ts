import { requireAdmin } from '../../../utils/auth'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    include: { category: true, inventory: true }
  })
})
