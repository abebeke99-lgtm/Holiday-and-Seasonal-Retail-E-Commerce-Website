import { requireAdmin } from '../../../utils/auth'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return prisma.category.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { products: true } } } })
})
