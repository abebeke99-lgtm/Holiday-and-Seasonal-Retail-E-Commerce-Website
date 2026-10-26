import { prisma } from '../../utils/db'

export default defineEventHandler(() => prisma.category.findMany({
  where: { products: { some: { active: true } } },
  orderBy: { name: 'asc' },
  include: { _count: { select: { products: { where: { active: true } } } } }
}))
