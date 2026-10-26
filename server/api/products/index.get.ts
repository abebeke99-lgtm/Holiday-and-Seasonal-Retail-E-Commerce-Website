import { z } from 'zod'
import { prisma } from '../../utils/db'

const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().optional(),
  collection: z.string().optional(),
  sort: z.enum(['name', 'price-asc', 'price-desc', 'newest']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24)
})

export default defineEventHandler(async (event) => {
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid query parameters' })
  const { q, category, collection, sort, page, limit } = parsed.data
  const orderBy = sort === 'name' ? { name: 'asc' as const }
    : sort === 'price-asc' ? { price: 'asc' as const }
      : sort === 'price-desc' ? { price: 'desc' as const }
        : { createdAt: 'desc' as const }
  const where = {
    active: true,
    ...(q ? { OR: [{ name: { contains: q } }, { description: { contains: q } }, { sku: { contains: q } }] } : {}),
    ...(category ? { category: { slug: category } } : {}),
    ...(collection ? { collections: { some: { collection: { slug: collection, active: true } } } } : {})
  }
  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({
      where, orderBy, skip: (page - 1) * limit, take: limit,
      include: { category: true, inventory: { select: { quantity: true } } }
    }),
    prisma.product.count({ where })
  ])
  return { items, total, page, limit }
})
