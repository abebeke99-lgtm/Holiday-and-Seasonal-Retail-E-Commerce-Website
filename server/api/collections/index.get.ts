import { prisma } from '../../utils/db'

export default defineEventHandler(() => prisma.collection.findMany({
  where: { active: true },
  orderBy: { name: 'asc' },
  include: { products: { where: { product: { active: true } }, include: { product: { include: { category: true } } } } }
}))
