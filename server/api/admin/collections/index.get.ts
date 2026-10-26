import { requireAdmin } from '../../../utils/auth'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return prisma.collection.findMany({ orderBy: { name: 'asc' }, include: { products: true } })
})
