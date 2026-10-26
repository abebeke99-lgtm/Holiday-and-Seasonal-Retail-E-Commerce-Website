import { requireAdmin } from '../../../utils/auth'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return prisma.inventory.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { product: { select: { id: true, sku: true, name: true, active: true } } }
  })
})
