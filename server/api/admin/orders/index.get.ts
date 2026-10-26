import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50)
  }).safeParse(getQuery(event))
  if (!query.success) throw createError({ statusCode: 400, statusMessage: 'Invalid query parameters' })
  const { page, limit } = query.data
  const [items, total] = await prisma.$transaction([
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
      include: { user: { select: { id: true, name: true, email: true } }, items: true, payment: true }
    }),
    prisma.order.count()
  ])
  return { items, total, page, limit }
})
