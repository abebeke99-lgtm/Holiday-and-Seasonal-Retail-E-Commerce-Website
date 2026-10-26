import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const parsed = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50)
  }).safeParse(getQuery(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid query parameters' })
  const { page, limit } = parsed.data
  return prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    include: { actor: { select: { id: true, email: true, name: true } } }
  })
})
